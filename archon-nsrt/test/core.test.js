const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../archon-nsrt.user.js');
const archon = require('./fixtures/nekzali-archon.json');
// Mythic kill rFjRm3JvkxQbNGX1 fight 1, events for the Nek'zali transition abilities only.
const wclLog = require('./fixtures/nekzali-wcl.json');

const labelUrl = 'https://www.warcraftlogs.com/reports/rFjRm3JvkxQbNGX1?fight=1&source=3&type=casts&view=timeline';
const grid = core.cooldownGrid(archon.pageProps, labelUrl);
const nekzali = core.ENCOUNTERS[3470];

test('reads the cooldown grid row and the WarcraftLogs fight behind it', () => {
  assert.equal(grid.encounterId, 3470);
  assert.equal(grid.row.rankingLabel, '1');
  assert.deepEqual(core.parseLabelUrl(labelUrl), { code: 'rFjRm3JvkxQbNGX1', fightId: 1 });
  assert.equal(core.cooldownGrid(archon.pageProps, 'https://www.warcraftlogs.com/reports/other?fight=1'), null);
});

test("offers the player's abilities, not the boss's, with Archon's defaults", () => {
  const abilities = core.playerAbilities(grid.categories);
  assert.ok(abilities.every((a) => a.category !== "Nek'zali"));
  assert.deepEqual(abilities.filter((a) => a.isSelected).map((a) => a.name), ['Apotheosis', 'Divine Hymn']);
});

test('asks WarcraftLogs only for the transition abilities', () => {
  assert.equal(core.eventFilter(nekzali.transitions), 'ability.id in (1295124,1292248,1290003)');
  assert.equal(core.eventFilter(core.ENCOUNTERS[3445].transitions), 'ability.id in (1284588,1284606)');
});

test("finds Nek'zali's NSRT phase changes in the log", () => {
  assert.deepEqual(core.phaseStarts(nekzali.transitions, wclLog), [
    { phase: 1, start: 0 },
    { phase: 1.5, start: 82763 }, // Ritual of Awakening cast completes
    { phase: 1.75, start: 144196 }, // second Soul Transfer cast start, 25s+ into 1.5
    { phase: 2, start: 195819 }, // boss gains 1290003 as the last Echo dies
  ]);
});

test('writes phase-relative reminders for the chosen spells', () => {
  const starts = core.phaseStarts(nekzali.transitions, wclLog);
  const lines = core.reminderLines(grid.row.events, [200183, 64843], starts, 'Tomasn');
  const note = core.buildNote({ encounterId: 3470, name: `${nekzali.name} holy #1`, difficulty: 'Mythic', lines });
  assert.equal(note, [
    "EncounterID:3470;Name:Nek'zali the Soulcoiler holy #1;Difficulty:Mythic",
    'tag:Tomasn;time:27.3;spellid:200183;ph:1',
    'tag:Tomasn;time:69.4;spellid:64843;ph:1',
    'tag:Tomasn;time:24.3;spellid:200183;ph:1.75',
    'tag:Tomasn;time:49.7;spellid:64843;ph:1.75',
    'tag:Tomasn;time:94.1;spellid:200183;ph:2',
    'tag:Tomasn;time:120.1;spellid:64843;ph:2',
  ].join('\n'));
});

test('keeps pull-relative times in phase 1 when NSRT has no phase detection', () => {
  const starts = core.phaseStarts([], wclLog);
  assert.deepEqual(core.reminderLines(grid.row.events, [200183], starts, 'everyone'), [
    'tag:everyone;time:27.3;spellid:200183;ph:1',
    'tag:everyone;time:168.5;spellid:200183;ph:1',
    'tag:everyone;time:290;spellid:200183;ph:1',
  ]);
});

test('turns the typed tag into NSRT tags: names without realm, spec IDs, roles', () => {
  assert.equal(core.nsrtTag('  Tomasn-Ragnaros '), 'Tomasn');
  assert.equal(core.nsrtTag('Tomasn, healer 257'), 'Tomasn healer 257');
  assert.equal(core.nsrtTag(''), 'everyone');
});

test('counts one Entombed Sentinels phase per Stasis, though both bosses lose it', () => {
  const stasisEnds = (at) => [
    { timestamp: at, type: 'removebuff', abilityGameID: 1284588 },
    { timestamp: at + 23, type: 'removebuff', abilityGameID: 1284606 },
  ];
  const log = { fightStart: 0, events: [...stasisEnds(55457), ...stasisEnds(156473)] };
  assert.deepEqual(core.phaseStarts(core.ENCOUNTERS[3445].transitions, log), [
    { phase: 1, start: 0 },
    { phase: 2, start: 55457 },
    { phase: 3, start: 156473 },
  ]);
});

test('ignores matches inside minDelay and stops at the last phase reached', () => {
  const debuff = (at, abilityGameID) => ({ timestamp: 1000 + at, type: 'applydebuff', abilityGameID });
  // The Lost Explorers: empowered bosses debuff themselves in any order.
  const log = { fightStart: 1000, events: [debuff(30000, 1292785), debuff(63000, 1292785), debuff(120000, 1292784), debuff(186600, 1292784)] };
  assert.deepEqual(core.phaseStarts(core.ENCOUNTERS[3497].transitions, log), [
    { phase: 1, start: 0 },
    { phase: 2, start: 63000 }, // 30s is inside phase 1's 40s guard
    { phase: 3, start: 186600 }, // 120s is only 57s into phase 2
  ]);
});
