#!/usr/bin/env node
// Plans every boss in data/ and writes out/notes.txt, one NSRT import holding a note
// per boss, and out/report.md, which shows why each cast sits where it does.
const fs = require('node:fs');
const path = require('node:path');
const plan = require('./plan.js');

const DATA_DIR = path.join(__dirname, 'data');
const OUT_DIR = path.join(__dirname, 'out');
const NEAR_OWN_CAST = 10;

const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const millions = (x) => `${Math.round(x / 1e6)}M`;
const range = (xs) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)}–${Math.max(...xs)}`);

function paceTable(data, result) {
  const lengthOf = (logs, phase) => {
    const length = plan.medianPhaseLength(logs, phase);
    return length == null ? '—' : clock(length);
  };
  const kills = data.guild.filter((p) => p.kill);
  // A boss NSRT keeps in phase 1 only needs the kill row.
  const rows = result.pace.length > 1 ? result.pace.map(({ phase, length }) => `| ${phase} | ${clock(length)} | ${lengthOf(result.neighbors, phase)} | ${lengthOf(data.top, phase)} |`) : [];
  const total = (logs) => clock(plan.median(logs.map((l) => l.duration)));
  const paceTotal = result.pace.reduce((sum, p) => sum + p.length, 0);
  return [
    `| NSRT phase | ${kills.length ? `Your kill${kills.length > 1 ? 's (median)' : ''}` : 'Your projected kill'} | ${result.neighbors.length} closest top logs | All ${data.top.length} top logs |`,
    '| --- | --- | --- | --- |',
    ...rows,
    `| Kill | ${clock(paceTotal)} | ${total(result.neighbors)} | ${total(data.top)} |`,
  ].join('\n');
}

function castRow(data, result, cast) {
  const spell = plan.SPELLS.find((s) => s.id === cast.spellId);
  const [from, to] = spell.window;
  const profile = plan.needProfile(data.guild, cast.phase, cast.at + to + 1);
  const window = profile.slice(Math.max(0, cast.at + from), cast.at + to);
  const byAbility = {};
  for (const s of window) for (const [id, amount] of Object.entries(s.byAbility)) byAbility[id] = (byAbility[id] || 0) + amount;
  const hits = Object.entries(byAbility).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id]) => data.abilities[id] || id).join(', ');

  const overlaps = {};
  let reached = 0;
  let mine = 0;
  for (const pull of data.guild) {
    const span = plan.phaseSpans(pull).find((s) => s.phase === cast.phase);
    if (!span || span.length <= cast.at * 1000) continue;
    reached++;
    const lo = span.start + (cast.at + from) * 1000;
    const hi = span.start + (cast.at + to) * 1000;
    const seen = new Set();
    for (const cd of pull.raidCds) {
      const known = plan.RAID_CDS[cd.id];
      if (known && cd.t < hi && cd.t + known.seconds * 1000 > lo) seen.add(`${known.name} (${cd.who})`);
    }
    for (const name of seen) overlaps[name] = (overlaps[name] || 0) + 1;
    if (plan.phaseCasts(pull, cast.spellId).some((c) => c.phase === cast.phase && Math.abs(c.at - cast.at) <= NEAR_OWN_CAST)) mine++;
  }
  const others = Object.entries(overlaps).map(([name, n]) => `${name} ${n}/${reached}`).join(', ') || '—';
  let when = clock(plan.paceSpans(result.pace).find((s) => s.phase === cast.phase).start + cast.at * 1000);
  if (cast.guessed) when += ', past your best pull';
  else if (result.killed && reached < data.guild.length) when += `, only in ${reached}/${data.guild.length} kills`;
  else if (reached < data.guild.length) when += `, reached in ${reached}/${data.guild.length} pulls`;
  const damage = cast.guessed ? '—' : millions(window.reduce((sum, s) => sum + s.damage, 0));
  return `| ph ${cast.phase} + ${cast.at}s | ${spell.name} | ${when} | ${cast.hits}/${cast.inPhase} | ${damage} | ${hits || '—'} | ${others} | ${reached ? `${mine}/${reached}` : '—'} |`;
}

// Each kill scored on its own damage: the player's casts there, against a plan made
// without that kill. Scoring a plan on the kills it was made from would flatter it.
function heldOut(data, kills) {
  return kills.map((kill) => {
    const { casts } = plan.planBoss({ top: data.top, guild: data.guild.filter((p) => p !== kill) });
    const yours = plan.SPELLS.flatMap((s) => plan.phaseCasts(kill, s.id).map((c) => ({ ...c, spellId: s.id })));
    return `${kill.date}: plan ${millions(plan.answeredDamage([kill], casts))}, you ${millions(plan.answeredDamage([kill], yours))}`;
  });
}

function bossSection(data) {
  const result = plan.planBoss(data);
  const kills = data.guild.filter((p) => p.kill).sort((a, b) => a.date.localeCompare(b.date));
  const lines = [`## ${data.name}`, ''];
  if (kills.length) {
    lines.push(`From your ${kills.length} Mythic kill${kills.length > 1 ? 's' : ''} (${kills.map((k) => k.date).join(', ')}) and the ${result.neighbors.length} of ${data.top.length} top ${data.spec} logs whose phases ran closest to yours.`);
  } else {
    const best = plan.bestPull(data.guild);
    lines.push(
      `Not killed yet. From your ${data.guild.length} best pulls (best: ${best.fightPercentage}% at ${clock(best.duration)}) and the ${result.neighbors.length} of ${data.top.length} top ${data.spec} logs closest to the projected kill. ` +
        `The projection assumes the boss keeps losing health as fast as in your best pull; casts past that pull sit where top players agree.`,
    );
  }
  lines.push('', paceTable(data, result), '');
  lines.push(`| NSRT time | Spell | ${kills.length ? 'In your median kill' : 'In the projected kill'} | Top players within ${plan.SUPPORT_RADIUS}s | Raid damage in its window | Biggest hits | Other healers' cooldowns there | You, within 10s |`);
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const cast of result.casts) lines.push(castRow(data, result, cast));
  lines.push('');
  const planned = plan.SPELLS.map((s) => `${result.casts.filter((c) => c.spellId === s.id).length} ${s.name}`).join(', ');
  if (kills.length) {
    const yours = plan.SPELLS.map((s) => `${range(kills.map((k) => k.casts.filter((c) => c.id === s.id).length))} ${s.name}`).join(', ');
    lines.push(`This plan: ${planned}. In your kill${kills.length > 1 ? 's' : ''}: ${yours}.`);
    lines.push(
      kills.length > 1
        ? `Raid damage the cooldowns answer in each kill, planned from the other kills only: ${heldOut(data, kills).join('; ')}.`
        : 'With one kill there is no other kill to test the plan on.',
    );
  } else {
    lines.push(`This plan: ${planned}.`);
  }
  return { section: lines.join('\n'), note: plan.noteFor({ encounterId: data.encounterId, name: `${data.name} ${data.player}`, tag: data.player, casts: result.casts }) };
}

function main() {
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json')).sort() : [];
  if (!files.length) {
    console.error('No boss data in tailor/data/: run node tailor/collect.js first.');
    process.exit(1);
  }
  const all = files.map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')));
  const bosses = all.map(bossSection);
  const { player, collected } = all[0];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'notes.txt'), `${bosses.map((b) => b.note).join('\n')}\n`);
  const intro = [
    `# ${player}'s ${plan.SPELLS.map((s) => s.name).join(' and ')} plan`,
    '',
    `Logs collected ${collected}. Paste notes.txt into NSRT → Reminders → Personal → Import; it holds one note per boss.`,
    '',
    'Each cast goes where it answers the most raid damage (tanks excluded) in your own pulls, with damage inside another',
    "healer's raid cooldown counting half. Top players whose phases ran like yours pull the plan toward the seconds they",
    'agree on. Phase times are seconds since NSRT\'s phase change, so reminders stay on the boss\'s timers when a phase',
    `runs shorter or longer. Each cast comes at least its cooldown plus ${plan.COOLDOWN_SLACK}s after the one before in every kill so far;`,
    'a kill with phases shorter than your shortest yet can bring a reminder before the spell is back.',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'report.md'), `${[intro, ...bosses.map((b) => b.section)].join('\n\n')}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT_DIR)}/notes.txt and report.md for ${bosses.length} bosses.`);
}

main();
