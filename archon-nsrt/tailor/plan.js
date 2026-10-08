// Plans one player's raid cooldowns per boss as NSRT reminder notes, from two
// sources: top logs of the player's spec, and the player's guild's own pulls.
//
// A cast at a given second scores the non-tank raid damage the guild took in the
// spell's window in its own pulls, with damage already inside another healer's raid
// cooldown counting half. Top players in kills paced like the guild's raise the score
// where they agree: by AGREEMENT times the share of them who cast the spell within
// SUPPORT_RADIUS. The plan is the set of casts the cooldown allows in every kill with
// the highest total.
const core = require('../archon-nsrt.user.js');

// `window`: the seconds of raid damage, relative to the cast, that the spell answers.
// Divine Hymn's channel heals for ~5s; Apotheosis lasts 32s (both measured in logs).
const SPELLS = [
  { id: 64843, name: 'Divine Hymn', cooldown: 120, window: [-3, 5] },
  { id: 200183, name: 'Apotheosis', cooldown: 120, window: [0, 32] },
];

// Other healers' raid cooldowns, and how many seconds after the cast each covers.
const RAID_CDS = {
  31821: { name: 'Aura Mastery', seconds: 8 },
  98008: { name: 'Spirit Link Totem', seconds: 6 },
  108280: { name: 'Healing Tide Totem', seconds: 10 },
  740: { name: 'Tranquility', seconds: 6 },
  64843: { name: 'Divine Hymn', seconds: 5 },
};

const NEIGHBORS = 20;
const SUPPORT_RADIUS = 5;
const AGREEMENT = 2;
const COVERED_WEIGHT = 0.5;
// Seconds a cast may come late, or a phase run short, before the next cast is still on cooldown.
const COOLDOWN_SLACK = 2;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

// A log's phases as [{ phase, start, length }] in ms from the pull.
function phaseSpans({ starts, duration }) {
  return starts.map((s, i) => ({ phase: s.phase, start: s.start, length: (starts[i + 1]?.start ?? duration) - s.start }));
}

const spanOf = (spans, phase) => spans.find((s) => s.phase === phase);

// The median length in ms of `phase` over the logs that reached it, or null.
function medianPhaseLength(logs, phase) {
  const lengths = logs.map((l) => spanOf(phaseSpans(l), phase)?.length).filter((l) => l != null);
  return lengths.length ? median(lengths) : null;
}

// The pull with the least boss health left.
const bestPull = (pulls) => pulls.reduce((a, b) => (b.fightPercentage < a.fightPercentage ? b : a));

// The phase lengths to plan for: the median over the guild's kills. Before a first
// kill: the best pull, its last phase stretched to the projected kill time, which
// assumes the boss keeps losing health as fast as in that pull.
function guildPace(pulls) {
  const kills = pulls.filter((p) => p.kill);
  if (kills.length) {
    const phases = [...new Set(kills.flatMap((p) => p.starts.map((s) => s.phase)))].sort((a, b) => a - b);
    return phases.map((phase) => ({ phase, length: medianPhaseLength(kills, phase) }));
  }
  const best = bestPull(pulls);
  const spans = phaseSpans(best).map(({ phase, length }) => ({ phase, length }));
  spans[spans.length - 1].length += best.duration / (1 - best.fightPercentage / 100) - best.duration;
  return spans;
}

// The pace's phases laid end to end from the pull: [{ phase, start, length }].
function paceSpans(pace) {
  let start = 0;
  return pace.map(({ phase, length }) => {
    const span = { phase, start, length };
    start += length;
    return span;
  });
}

function paceDistance(log, pace) {
  const spans = phaseSpans(log);
  let distance = 0;
  for (const { phase, length } of pace) {
    const span = spanOf(spans, phase);
    if (!span) return Infinity;
    distance += Math.abs(span.length - length);
  }
  return distance;
}

function nearestLogs(logs, pace, k = NEIGHBORS) {
  return logs
    .map((log) => ({ log, distance: paceDistance(log, pace) }))
    .filter((x) => x.distance < Infinity)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)
    .map((x) => x.log);
}

// A log's casts of one spell as [{ phase, at }], `at` in seconds into the phase.
function phaseCasts(log, spellId) {
  return log.casts
    .filter((c) => c.id === spellId)
    .map((c) => {
      const s = core.phaseAt(log.starts, c.t);
      return { phase: s.phase, at: (c.t - s.start) / 1000 };
    });
}

// For each second of each phase: how many of the logs still in the phase (`inPhase`)
// cast the spell within SUPPORT_RADIUS (`hits`). `horizon`: how many ms of each phase to cover.
function agreement(logs, spellId, horizon) {
  const seconds = [];
  for (const { phase, length } of horizon) {
    const lengths = logs.map((l) => (spanOf(phaseSpans(l), phase)?.length ?? 0) / 1000);
    const casts = logs.map((l) => phaseCasts(l, spellId).filter((c) => c.phase === phase).map((c) => c.at));
    for (let at = 0; at <= length / 1000; at++) {
      const inPhase = lengths.filter((len) => len > at).length;
      const hits = casts.filter((cs) => cs.some((c) => Math.abs(c - at) <= SUPPORT_RADIUS)).length;
      seconds.push({ phase, at, hits, inPhase });
    }
  }
  return seconds;
}

// Fight seconds covered by other healers' raid cooldowns in one pull.
function coveredSeconds(pull) {
  const covered = new Set();
  for (const cd of pull.raidCds) {
    const first = Math.floor(cd.t / 1000);
    for (let s = first; s < first + (RAID_CDS[cd.id]?.seconds ?? 0); s++) covered.add(s);
  }
  return covered;
}

// What the guild needed in one phase, per second `u` into it: `pulls`, how many pulls
// were still in the phase; `reach`, their share; `damage`, their mean non-tank raid
// damage; `covered`, the share with another healer's raid cooldown up; `byAbility`,
// mean damage per ability. `planned`: [{ phase, at, seconds }], the player's own
// cooldowns planned so far, which cover too.
function needProfile(pulls, phase, seconds, planned = []) {
  const live = pulls.map((p) => ({ p, span: spanOf(phaseSpans(p), phase), covered: coveredSeconds(p) }));
  const mine = new Set(planned.filter((c) => c.phase === phase).flatMap((c) => Array.from({ length: c.seconds }, (_, i) => Math.floor(c.at) + i)));
  return Array.from({ length: seconds }, (_, u) => {
    const here = live.filter((x) => x.span && x.span.length / 1000 > u);
    const profile = { pulls: here.length, reach: pulls.length ? here.length / pulls.length : 0, damage: 0, covered: 0, byAbility: {} };
    for (const { p, span, covered } of here) {
      const second = Math.floor(span.start / 1000) + u;
      const slot = p.perSecond[second];
      if (covered.has(second) || mine.has(u)) profile.covered += 1 / here.length;
      if (!slot) continue;
      profile.damage += slot.total / here.length;
      for (const [id, amount] of Object.entries(slot.by)) profile.byAbility[id] = (profile.byAbility[id] || 0) + amount / here.length;
    }
    return profile;
  });
}

// The raid damage a cast at `at` (s into the phase) answers; damage another cooldown
// already covers counts COVERED_WEIGHT.
function windowDamage(profile, at, [from, to]) {
  const start = Math.max(0, Math.round(at) + from);
  return profile
    .slice(start, Math.max(start, Math.round(at) + to))
    .reduce((sum, s) => sum + s.damage * (1 - (1 - COVERED_WEIGHT) * s.covered), 0);
}

// Whether `b` follows `a` after the cooldown and COOLDOWN_SLACK in every layout where both are cast.
function cooldownFits(a, b, spell, layouts) {
  return layouts.every((spans) => {
    const sa = spanOf(spans, a.phase);
    const sb = spanOf(spans, b.phase);
    if (!sa || !sb || a.at * 1000 >= sa.length || b.at * 1000 >= sb.length) return true;
    return sb.start + b.at * 1000 - (sa.start + a.at * 1000) >= (spell.cooldown + COOLDOWN_SLACK) * 1000;
  });
}

// The candidates with the highest total need that the cooldown allows in every layout.
function schedule(options, spell, layouts) {
  const sorted = [...options].sort((a, b) => a.phase - b.phase || a.at - b.at);
  // total[i]: the best plan ending with sorted[i]; prev[i]: the cast before it, or -1.
  const total = [];
  const prev = [];
  sorted.forEach((c, i) => {
    prev[i] = -1;
    for (let j = 0; j < i; j++) {
      if (cooldownFits(sorted[j], c, spell, layouts) && (prev[i] < 0 || total[j] > total[prev[i]])) prev[i] = j;
    }
    total[i] = c.need + (prev[i] < 0 ? 0 : total[prev[i]]);
  });
  const chosen = [];
  for (let i = total.indexOf(Math.max(...total)); i >= 0; i = prev[i]) chosen.unshift(sorted[i]);
  return chosen;
}

// How far into each phase to plan, in ms. A phase that another follows: only as far as
// it lasted in every kill, so no kill skips a planned cast and then casts a later one,
// and checking each cast against the one before it is enough. A kill's last phase: as
// long as any kill. Before a first kill: the projected kill.
function planHorizon(guild, pace) {
  const kills = guild.filter((p) => p.kill);
  if (!kills.length) return pace;
  return pace.map(({ phase }) => {
    const seen = kills.flatMap((p) => {
      const spans = phaseSpans(p);
      const i = spans.findIndex((s) => s.phase === phase);
      return i < 0 ? [] : [{ length: spans[i].length, last: i === spans.length - 1 }];
    });
    const followed = seen.filter((s) => !s.last).map((s) => s.length);
    return { phase, length: followed.length ? Math.min(...followed) : Math.max(...seen.map((s) => s.length)) };
  });
}

// The seconds the player's own casts of `spell` cover, as needProfile takes them.
function ownCover(spell, casts) {
  return casts.map((c) => ({ phase: c.phase, at: c.at + spell.window[0], seconds: spell.window[1] - spell.window[0] }));
}

// The whole plan for one boss. `data`: { top, guild } as collect.js writes them.
function planBoss({ top, guild }) {
  const pace = guildPace(guild);
  const killed = guild.some((p) => p.kill);
  // Anonymous rankings come back with no casts, and say nothing about timing.
  const neighbors = nearestLogs(top.filter((l) => l.casts.length), pace);
  const horizon = planHorizon(guild, pace);
  const layouts = killed ? guild.map(phaseSpans) : [paceSpans(pace)];
  const planned = [];
  const casts = [];
  for (const spell of SPELLS) {
    const profiles = Object.fromEntries(horizon.map(({ phase, length }) => [phase, needProfile(guild, phase, Math.ceil(length / 1000) + 1, planned)]));
    const observed = Object.values(profiles).flat().filter((s) => s.pulls > 0);
    const meanWindow = (observed.reduce((sum, s) => sum + s.damage, 0) / Math.max(1, observed.length)) * (spell.window[1] - spell.window[0]);
    const options = agreement(neighbors, spell.id, horizon)
      .map((c) => {
        const here = profiles[c.phase][c.at];
        // After a kill, a cast weighs as much as the share of kills still going then.
        // Before one, every cast up to the projected kill counts in full, and one past
        // the best pull scores the boss's mean damage for a window that long.
        const guessed = !here || here.pulls === 0;
        const weight = killed ? here?.reach ?? 0 : 1;
        const damage = guessed ? meanWindow : windowDamage(profiles[c.phase], c.at, spell.window);
        const agreed = c.inPhase ? c.hits / c.inPhase : 0;
        return { ...c, spellId: spell.id, guessed, damage, need: damage * weight * (1 + AGREEMENT * agreed) };
      })
      .filter((c) => c.need > 0);
    const chosen = schedule(options, spell, layouts);
    casts.push(...chosen);
    planned.push(...ownCover(spell, chosen));
  }
  casts.sort((a, b) => a.phase - b.phase || a.at - b.at);
  return { pace, killed, neighbors, horizon, casts };
}

// The raid damage `casts` answer in the guild's pulls, scored as the plan scores a cast
// but without top players' agreement, so the plan and the player's own kills compare.
function answeredDamage(guild, casts) {
  const killed = guild.some((p) => p.kill);
  const planned = [];
  let total = 0;
  for (const spell of SPELLS) {
    const mine = casts.filter((c) => c.spellId === spell.id);
    for (const c of mine) {
      const profile = needProfile(guild, c.phase, Math.round(c.at) + spell.window[1] + 1, planned);
      total += windowDamage(profile, c.at, spell.window) * (killed ? profile[Math.round(c.at)]?.reach ?? 0 : 1);
    }
    planned.push(...ownCover(spell, mine));
  }
  return total;
}

function noteFor({ encounterId, name, tag, casts }) {
  const lines = casts.map((c) => core.reminderLine({ tag, at: c.at * 1000, spellId: c.spellId, phase: c.phase }));
  return core.buildNote({ encounterId, name, difficulty: 'Mythic', lines });
}

module.exports = {
  SPELLS, RAID_CDS, SUPPORT_RADIUS, COOLDOWN_SLACK, median, phaseSpans, medianPhaseLength, bestPull, guildPace, paceSpans, nearestLogs,
  phaseCasts, agreement, needProfile, windowDamage, schedule, planHorizon, planBoss, answeredDamage, noteFor,
};
