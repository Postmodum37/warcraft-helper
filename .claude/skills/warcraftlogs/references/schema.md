# WarcraftLogs v2 API — Schema Reference

API endpoint: `https://www.warcraftlogs.com/api/v2/client`
Auth: OAuth 2.0 client credentials (handled by `wcl.sh`)
Rate limit: 3600 points/hour (check via `rateLimitData`)

---

## Root Query Fields

| Field | Description |
|-------|-------------|
| `characterData` | Character lookups (rankings, reports) |
| `reportData` | Report lookups (fights, events, tables, rankings) |
| `guildData` | Guild lookups (attendance, members, progression) |
| `worldData` | Static data (zones, encounters, expansions, servers) |
| `gameData` | Game data (classes, abilities, items) |
| `rateLimitData` | API rate limit status |
| `progressRaceData` | World-first race (only active during races) |

---

## Difficulty Values

| Value | Difficulty |
|-------|-----------|
| 1 | LFR |
| 3 | Normal |
| 4 | Heroic |
| 5 | Mythic |
| 10 | Mythic+ (dungeons) |

---

## WoW-Relevant Metrics

For `encounterRankings` / `zoneRankings` / report `rankings`:

| Metric | Description | Use For |
|--------|-------------|---------|
| `default` | Auto-pick based on role | General |
| `dps` | Damage per second | DPS rankings |
| `hps` | Healing per second | Healer rankings |
| `bossdps` | Boss-only DPS | Boss damage focus |
| `wdps` | Weighted DPS (removes pad, rewards priority) | Accurate DPS ranking |
| `tankhps` | HPS to tanks | Tank healer focus |
| `playerscore` | M+ score / dungeon score | M+ rankings |
| `playerspeed` | Speed ranking | Speed kills |

For `zoneRankings` on M+ zones, also available:
| `points_and_damage` | Score + DPS throughput | M+ DPS combined |
| `points_and_healing` | Score + HPS throughput | M+ healer combined |

---

## Enums

### RoleType
`Any`, `DPS`, `Healer`, `Tank`

### RankingCompareType
- `Rankings` — compare against rankings (best per character)
- `Parses` — compare against all parses in a 2-week window

### RankingTimeframeType
- `Today` — current rankings
- `Historical` — all-time historical

### KillType (for report fights/events/tables)
`All`, `Encounters`, `Kills`, `Trash`, `Wipes`

### TableDataType / EventDataType / GraphDataType
`Summary`, `DamageDone`, `DamageTaken`, `Healing`, `Casts`, `Buffs`, `Debuffs`, `Deaths`, `Interrupts`, `Dispels`, `Resources`, `Summons`, `Threat`, `Survivability`

### ViewType (for tables/graphs)
`Default`, `Ability`, `Source`, `Target`

### HostilityType
`Friendlies`, `Enemies`

---

## Current Zone & Encounter IDs (Midnight — Expansion 7)

### VS / DR / MQD (Zone 46) — Current Raid
| ID | Boss |
|----|------|
| 3176 | Imperator Averzian |
| 3177 | Vorasius |
| 3178 | Vaelgor & Ezzorak |
| 3179 | Fallen-King Salhadaar |
| 3180 | Lightblinded Vanguard |
| 3181 | Crown of the Cosmos |
| 3306 | Chimaerus the Undreamt God |
| 3182 | Belo'ren, Child of Al'ar |
| 3183 | Midnight Falls |

### Mythic+ Season 1 (Zone 47) — Current M+ Season
| ID | Dungeon |
|----|---------|
| 112526 | Algeth'ar Academy |
| 12811 | Magister's Terrace |
| 12874 | Maisara Caverns |
| 12915 | Nexus-Point Xenas |
| 10658 | Pit of Saron |
| 361753 | Seat of the Triumvirate |
| 61209 | Skyreach |
| 12805 | Windrunner Spire |

## Previous Expansion Zones (The War Within — Expansion 6)

- Liberation of Undermine (Zone 42)
- Nerub-ar Palace (Zone 38)
- Manaforge Omega (Zone 44)
- Blackrock Depths (Zone 40)
- Mythic+ Season 3 (Zone 45)
- Mythic+ Season 2 (Zone 43)
- Mythic+ Season 1 (Zone 39)
- Delves (Zone 41)

### Expansions
| ID | Name |
|----|------|
| 7 | Midnight |
| 6 | The War Within |
| 5 | Dragonflight |
| 4 | Shadowlands |
| 3 | Battle for Azeroth |
| 2 | Legion |
| 1 | Warlords of Draenor |
| 0 | Mists of Pandaria |

---

## CharacterData

### character(name, serverSlug, serverRegion) or character(id)

Key fields:
- `name`, `classID`, `level`, `faction`, `server { slug region { slug } }`
- `encounterRankings(encounterID, difficulty, metric, specName, role, partition, timeframe, compare, size, byBracket, className)` → JSON
- `zoneRankings(zoneID, difficulty, metric, specName, role, partition, timeframe, compare, size, byBracket, className)` → JSON
- `recentReports(limit, page)` → paginated reports
- `guilds` → list of guilds
- `gameData(specID)` → cached gear/talent data (JSON)

### Server slugs
Server slugs are lowercase, hyphenated: `"illidan"`, `"area-52"`, `"tichondrius"`, `"stormrage"`, etc.
Regions: `"us"`, `"eu"`, `"kr"`, `"tw"`, `"cn"`

---

## ReportData

### report(code) — code is the alphanumeric string from the WCL URL

Key fields:
- `code`, `title`, `startTime`, `endTime`, `visibility`
- `guild { name server { slug } }`, `owner { name }`
- `zone { name id }`
- `fights(killType, difficulty, encounterID, fightIDs)` → list of ReportFight
  - ReportFight: `id`, `encounterID`, `name`, `kill`, `startTime`, `endTime`, `size`, `difficulty`
- `masterData(translate)` → actors, abilities
  - `actors(type)` — type: `"Player"`, `"NPC"`, `"Pet"` → `id`, `gameID`, `name`, `server`, `subType`
- `playerDetails(fightIDs, encounterID, difficulty, killType)` → JSON (specs, talents, gear per player)
- `table(dataType, fightIDs, encounterID, difficulty, startTime, endTime, sourceID, targetID, hostilityType, viewBy, killType, filterExpression)` → JSON
- `events(dataType, fightIDs, encounterID, startTime, endTime, sourceID, targetID, limit, filterExpression, hostilityType, killType)` → paginated events
- `graph(dataType, fightIDs, encounterID, startTime, endTime, sourceID, hostilityType, viewBy, killType)` → JSON
- `rankings(encounterID, fightIDs, difficulty, compare, playerMetric, timeframe)` → JSON
- `rankedCharacters` → list of Character
- `phases` → phase info for boss encounters

### Extracting report code from URLs
`https://www.warcraftlogs.com/reports/ABC123XYZ` → code is `ABC123XYZ`

---

## GuildData

### guild(name, serverSlug, serverRegion) or guild(id)

Key fields:
- `name`, `id`, `faction`, `server { slug region { slug } }`
- `description`, `competitionMode`, `stealthMode`
- `members(limit, page)` → paginated characters
- `attendance(zoneID, guildTagID, limit, page)` → paginated attendance data
- `tags` → list of GuildTag (raid teams)
- `zoneRanking(zoneId)` → GuildZoneRankings
  - `progress`, `speed`, `completeRaidSpeed` — each contains `worldRank`, `regionRank`, `serverRank`
  - Each rank: `number` (position), `percentile`, `color`

### reports (via reportData)
`reportData { reports(guildName, guildServerSlug, guildServerRegion, zoneID, startTime, endTime, limit, page) }`

---

## WorldData

- `zones(expansion_id)` → list of zones
- `zone(id)` → zone with `encounters { id name }`
- `encounter(id)` → encounter details
- `expansions` → all expansions
- `expansion(id)` → single expansion with zones
- `regions` / `region(id)` → regions and subregions
- `server(id)` or `server(slug, region)` → server info

---

## Pagination

Paginated types use `limit` and `page` params. Response includes:
```json
{
  "data": [...],
  "total": 100,
  "per_page": 25,
  "current_page": 1,
  "last_page": 4,
  "has_more_pages": true
}
```

---

## Rate Limit

```graphql
{ rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }
```
- 3600 points/hour
- Different queries cost different points
- `encounterRankings` and `zoneRankings` are relatively expensive
- `worldData` lookups are cheap
- Cache results when possible to conserve points
