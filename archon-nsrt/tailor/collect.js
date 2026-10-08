#!/usr/bin/env node
// Downloads what report.js plans from into data/<encounterId>.json: the top logs of
// the player's spec, and the guild's Mythic pulls with the player in them.
const fs = require('node:fs');
const path = require('node:path');
const core = require('../archon-nsrt.user.js');
const { SPELLS, RAID_CDS } = require('./plan.js');
const wcl = require('./wcl.js');

const CONFIG = {
  guildId: 782610,
  player: 'Pawstyi',
  className: 'Priest',
  specName: 'Holy',
  zone: 'The Venomous Abyss',
  topLogs: 100,
  // Before a first kill, the guild's best pulls stand in for its kills.
  bestPulls: 8,
};
const MYTHIC = 5;
const DATA_DIR = path.join(__dirname, 'data');

const REPORTS = `query ($guild: Int!, $page: Int!) { reportData { reports(guildID: $guild, limit: 100, page: $page) {
  has_more_pages data { code zone { name } } } } }`;
const REPORT = `query ($code: String!) { reportData { report(code: $code) {
  startTime
  fights(killType: Encounters) { id encounterID difficulty kill startTime endTime fightPercentage friendlyPlayers }
  masterData { actors(type: "Player") { id name } abilities { gameID name } }
} } }`;
const DETAILS = `query ($code: String!, $fight: Int!) { reportData { report(code: $code) { playerDetails(fightIDs: [$fight]) } } }`;
const FIGHT = `query ($code: String!, $fight: Int!) { reportData { report(code: $code) { fights(fightIDs: [$fight]) { id startTime endTime } } } }`;
const RANKINGS = `query ($encounter: Int!, $className: String!, $specName: String!, $page: Int!) { worldData { encounter(id: $encounter) {
  characterRankings(className: $className, specName: $specName, difficulty: ${MYTHIC}, metric: hps, page: $page) } } }`;

const spellFilter = (player) => `source.name = "${player}" and type = "cast" and ability.id in (${SPELLS.map((s) => s.id)})`;

async function phaseStartsOf(code, fight, encounterId) {
  const { transitions } = core.ENCOUNTERS[encounterId];
  const events = transitions.length ? await wcl.events({ code, fight, hostility: 'Enemies', filter: core.eventFilter(transitions) }) : [];
  return core.phaseStarts(transitions, { fightStart: fight.startTime, events });
}

async function playerCasts(code, fight, player) {
  const events = await wcl.events({ code, fight, dataType: 'Casts', filter: spellFilter(player) });
  return events.map((e) => ({ t: e.timestamp - fight.startTime, id: e.abilityGameID }));
}

async function guildPulls() {
  const codes = [];
  for (let page = 1; ; page++) {
    const { reports } = (await wcl.query(REPORTS, { guild: CONFIG.guildId, page })).reportData;
    codes.push(...reports.data.filter((r) => r.zone?.name === CONFIG.zone).map((r) => r.code));
    if (!reports.has_more_pages) break;
  }
  const pulls = [];
  for (const code of codes) {
    const report = (await wcl.query(REPORT, { code })).reportData.report;
    const me = report.masterData.actors.find((a) => a.name === CONFIG.player);
    for (const fight of report.fights) {
      if (fight.difficulty !== MYTHIC || !me || !fight.friendlyPlayers.includes(me.id) || !core.ENCOUNTERS[fight.encounterID]) continue;
      pulls.push({ code, report, me, fight, pulledAt: report.startTime + fight.startTime });
    }
  }
  // The same pull logged by two raiders: keep one.
  return pulls.filter((p, i) => !pulls.slice(0, i).some((q) => q.fight.encounterID === p.fight.encounterID && Math.abs(q.pulledAt - p.pulledAt) < 5000));
}

async function guildPull({ code, report, me, fight, pulledAt }) {
  const details = (await wcl.query(DETAILS, { code, fight: fight.id }, { cache: true })).reportData.report.playerDetails.data.playerDetails;
  const tanks = new Set(details.tanks.map((t) => t.id));
  const healers = new Map(details.healers.filter((h) => h.id !== me.id).map((h) => [h.id, h.name]));
  const players = new Set(report.masterData.actors.map((a) => a.id));
  const raidCds = await wcl.events({ code, fight, dataType: 'Casts', filter: `type = "cast" and ability.id in (${Object.keys(RAID_CDS)})` });
  const damage = await wcl.events({ code, fight, dataType: 'DamageTaken', filter: 'type = "damage"' });
  const perSecond = {};
  for (const e of damage) {
    if (!players.has(e.targetID) || tanks.has(e.targetID)) continue;
    const slot = (perSecond[Math.floor((e.timestamp - fight.startTime) / 1000)] ||= { total: 0, by: {} });
    const amount = (e.amount || 0) + (e.absorbed || 0);
    slot.total += amount;
    slot.by[e.abilityGameID] = (slot.by[e.abilityGameID] || 0) + amount;
  }
  return {
    code,
    fightId: fight.id,
    date: new Date(pulledAt).toISOString().slice(0, 10),
    kill: fight.kill,
    fightPercentage: fight.fightPercentage,
    duration: fight.endTime - fight.startTime,
    starts: await phaseStartsOf(code, fight, fight.encounterID),
    casts: await playerCasts(code, fight, CONFIG.player),
    raidCds: raidCds.filter((e) => healers.has(e.sourceID)).map((e) => ({ t: e.timestamp - fight.startTime, id: e.abilityGameID, who: healers.get(e.sourceID) })),
    perSecond,
  };
}

async function topLogs(encounterId) {
  const rankings = [];
  for (let page = 1; rankings.length < CONFIG.topLogs; page++) {
    const r = (await wcl.query(RANKINGS, { encounter: encounterId, className: CONFIG.className, specName: CONFIG.specName, page })).worldData.encounter.characterRankings;
    rankings.push(...r.rankings);
    if (!r.hasMorePages) break;
  }
  return pool(rankings.slice(0, CONFIG.topLogs), 4, async (r, i) => {
    const { code, fightID } = r.report;
    const fight = (await wcl.query(FIGHT, { code, fight: fightID }, { cache: true })).reportData.report.fights[0];
    return {
      rank: i + 1,
      player: r.name,
      code,
      fightId: fightID,
      duration: fight.endTime - fight.startTime,
      starts: await phaseStartsOf(code, fight, encounterId),
      casts: await playerCasts(code, fight, r.name),
    };
  });
}

async function pool(items, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

async function main() {
  const pulls = await guildPulls();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const [encounterId, all] of Object.entries(Object.groupBy(pulls, (p) => p.fight.encounterID))) {
    const kills = all.filter((p) => p.fight.kill);
    const chosen = kills.length ? kills : all.sort((a, b) => a.fight.fightPercentage - b.fight.fightPercentage).slice(0, CONFIG.bestPulls);
    const abilities = {};
    for (const p of chosen) for (const a of p.report.masterData.abilities) abilities[a.gameID] = a.name;
    const data = {
      encounterId: Number(encounterId),
      name: core.ENCOUNTERS[encounterId].name,
      player: CONFIG.player,
      spec: `${CONFIG.specName} ${CONFIG.className}`,
      collected: new Date().toISOString().slice(0, 10),
      guild: await pool(chosen, 4, guildPull),
      top: await topLogs(Number(encounterId)),
      abilities,
    };
    fs.writeFileSync(path.join(DATA_DIR, `${encounterId}.json`), JSON.stringify(data));
    console.log(`${data.name}: ${kills.length ? `${kills.length} kills` : `no kill, best ${chosen.length} of ${all.length} pulls`}, ${data.top.length} top logs`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
