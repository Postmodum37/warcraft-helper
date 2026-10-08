const test = require('node:test');
const assert = require('node:assert/strict');
const plan = require('../tailor/plan.js');

const DH = 64843;
const APO = 200183;
const s = (seconds) => seconds * 1000;

// A pull with phase starts and lengths in seconds, `damage` as { second: amount }.
function pull({ starts = [0], duration, kill = true, fightPercentage = 0, casts = [], raidCds = [], damage = {} }) {
  return {
    kill,
    fightPercentage,
    duration: s(duration),
    starts: starts.map((start, i) => ({ phase: i + 1, start: s(start) })),
    casts: casts.map(([at, id]) => ({ t: s(at), id })),
    raidCds: raidCds.map(([at, id]) => ({ t: s(at), id, who: 'Healer' })),
    perSecond: Object.fromEntries(Object.entries(damage).map(([second, total]) => [second, { total, by: { 1: total } }])),
  };
}

test("plans for the median of the guild's kills", () => {
  const kills = [pull({ starts: [0, 100], duration: 300 }), pull({ starts: [0, 120], duration: 330 }), pull({ starts: [0, 140], duration: 400 })];
  assert.deepEqual(plan.guildPace(kills), [{ phase: 1, length: s(120) }, { phase: 2, length: s(210) }]);
});

test('before a first kill, projects the best pull to a kill at the same health loss rate', () => {
  const wipes = [pull({ duration: 150, kill: false, fightPercentage: 70 }), pull({ duration: 200, kill: false, fightPercentage: 50 })];
  assert.deepEqual(plan.guildPace(wipes), [{ phase: 1, length: s(400) }]);
});

test('compares against the top logs whose phases ran closest, skipping logs that missed a phase', () => {
  const pace = [{ phase: 1, length: s(120) }, { phase: 2, length: s(200) }];
  const top = [
    { id: 'fast', ...pull({ starts: [0, 80], duration: 250 }) },
    { id: 'close', ...pull({ starts: [0, 118], duration: 320 }) },
    { id: 'no phase 2', ...pull({ duration: 320 }) },
  ];
  assert.deepEqual(plan.nearestLogs(top, pace, 5).map((l) => l.id), ['close', 'fast']);
});

test('counts agreement among the top logs still in the phase', () => {
  const logs = [pull({ duration: 100, casts: [[30, DH]] }), pull({ duration: 100, casts: [[34, DH]] }), pull({ duration: 20 })];
  const at = (t) => plan.agreement(logs, DH, [{ phase: 1, length: s(100) }]).find((x) => x.at === t);
  assert.deepEqual(at(32), { phase: 1, at: 32, hits: 2, inPhase: 2 });
  assert.deepEqual(at(10), { phase: 1, at: 10, hits: 0, inPhase: 3 });
});

test("counts damage inside another healer's or the player's own cooldown at half", () => {
  const damage = { 10: 100, 11: 100, 12: 100 };
  const pulls = [pull({ duration: 60, damage, raidCds: [[10, 98008]] }), pull({ duration: 60, damage })];
  const profile = plan.needProfile(pulls, 1, 20);
  assert.equal(profile[10].covered, 0.5);
  assert.equal(plan.windowDamage(profile, 10, [0, 3]), 300 * 0.75);
  const own = plan.needProfile(pulls, 1, 20, [{ phase: 1, at: 11, seconds: 2 }]);
  assert.equal(plan.windowDamage(own, 10, [0, 3]), 100 * 0.75 + 200 * 0.5);
});

test('plans a phase that another follows only as far as every kill lasted in it', () => {
  const kills = [pull({ starts: [0, 100], duration: 250 }), pull({ starts: [0, 130], duration: 400 })];
  assert.deepEqual(plan.planHorizon(kills, plan.guildPace(kills)), [{ phase: 1, length: s(100) }, { phase: 2, length: s(270) }]);
});

test('picks the casts with the most need that the cooldown allows in every kill', () => {
  const spell = plan.SPELLS.find((x) => x.id === DH);
  const layouts = [plan.phaseSpans(pull({ starts: [0, 100], duration: 400 })), plan.phaseSpans(pull({ starts: [0, 130], duration: 400 }))];
  const options = [
    { phase: 1, at: 10, need: 5 },
    { phase: 1, at: 90, need: 8 },
    { phase: 2, at: 5, need: 6 }, // 105s after 1+10 in the first kill
    { phase: 2, at: 40, need: 6 },
  ];
  assert.deepEqual(plan.schedule(options, spell, layouts).map((c) => `${c.phase}+${c.at}`), ['1+10', '2+40']);
});

test('a full plan leaves every cooldown its slack in each kill', () => {
  const damage = Object.fromEntries(Array.from({ length: 420 }, (_, i) => [i, i % 60 < 8 ? 1000 : 100]));
  const kills = [
    pull({ starts: [0, 110, 250], duration: 400, damage, raidCds: [[60, 740]], casts: [[5, APO], [62, DH]] }),
    pull({ starts: [0, 130, 270], duration: 420, damage, casts: [[8, APO], [70, DH]] }),
  ];
  const top = Array.from({ length: 6 }, (_, i) => pull({ starts: [0, 115 + i * 3, 260 + i * 3], duration: 410, casts: [[3, APO], [60 + i, DH], [130 + i, APO], [190, DH], [260, APO], [320, DH]] }));
  const { casts } = plan.planBoss({ top, guild: kills });
  assert.ok(casts.length >= 6);
  for (const spell of plan.SPELLS) {
    for (const k of kills) {
      const spans = plan.phaseSpans(k);
      const times = casts
        .filter((c) => c.spellId === spell.id)
        .map((c) => ({ c, span: spans.find((x) => x.phase === c.phase) }))
        .filter(({ c, span }) => span && s(c.at) < span.length)
        .map(({ c, span }) => span.start + s(c.at));
      for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= s(spell.cooldown + 2), `${spell.name} ${times}`);
    }
  }
  const note = plan.noteFor({ encounterId: 3470, name: "Nek'zali the Soulcoiler Pawstyi", tag: 'Pawstyi', casts });
  assert.match(note, /^EncounterID:3470;Name:Nek'zali the Soulcoiler Pawstyi;Difficulty:Mythic\n/);
  assert.ok(note.split('\n').slice(1).every((line) => /^tag:Pawstyi;time:\d+(\.\d)?;spellid:(64843|200183);ph:[123]$/.test(line)));
});
