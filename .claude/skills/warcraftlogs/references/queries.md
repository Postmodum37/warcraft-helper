# WarcraftLogs Query Templates

Ready-to-use GraphQL queries. Replace placeholders `$NAME`, `$SERVER`, `$REGION`, etc. with actual values.

---

## 1. Character Zone Rankings (overall raid/M+ performance)

```graphql
{
  characterData {
    character(name: "$NAME", serverSlug: "$SERVER", serverRegion: "$REGION") {
      name
      classID
      zoneRankings(zoneID: $ZONE_ID, difficulty: $DIFFICULTY, metric: $METRIC)
    }
  }
}
```

**Common uses:**
- Raid overview: `zoneID: 42, difficulty: 5, metric: dps` (Mythic Liberation of Undermine DPS)
- M+ scores: `zoneID: 45, metric: playerscore` (M+ Season 3)
- Healer rankings: `metric: hps, role: Healer`

---

## 2. Character Encounter Rankings (specific boss parses)

```graphql
{
  characterData {
    character(name: "$NAME", serverSlug: "$SERVER", serverRegion: "$REGION") {
      name
      classID
      encounterRankings(encounterID: $ENCOUNTER_ID, difficulty: $DIFFICULTY, metric: $METRIC)
    }
  }
}
```

**Common uses:**
- Boss parse: `encounterID: 3016, difficulty: 5, metric: dps` (Mythic Gallywix DPS)
- With spec filter: add `specName: "Retribution"`
- Historical: add `timeframe: Historical`

---

## 3. Character Recent Reports

```graphql
{
  characterData {
    character(name: "$NAME", serverSlug: "$SERVER", serverRegion: "$REGION") {
      name
      recentReports(limit: 10) {
        data {
          code
          title
          startTime
          endTime
          zone { name }
          guild { name }
        }
      }
    }
  }
}
```

---

## 4. Report Overview (fights summary)

```graphql
{
  reportData {
    report(code: "$CODE") {
      title
      startTime
      endTime
      zone { name }
      guild { name }
      fights(killType: Encounters) {
        id
        encounterID
        name
        kill
        startTime
        endTime
        difficulty
        size
      }
    }
  }
}
```

---

## 5. Report Damage/Healing Table

```graphql
{
  reportData {
    report(code: "$CODE") {
      table(dataType: $DATA_TYPE, fightIDs: [$FIGHT_ID], hostilityType: Friendlies)
    }
  }
}
```

**dataType values:** `DamageDone`, `Healing`, `DamageTaken`, `Casts`, `Summary`

For all kills of a specific boss:
```graphql
{
  reportData {
    report(code: "$CODE") {
      table(dataType: DamageDone, encounterID: $ENCOUNTER_ID, killType: Kills)
    }
  }
}
```

---

## 6. Report Deaths Analysis

```graphql
{
  reportData {
    report(code: "$CODE") {
      table(dataType: Deaths, fightIDs: [$FIGHT_ID])
    }
  }
}
```

---

## 7. Report Rankings (how each player parsed)

```graphql
{
  reportData {
    report(code: "$CODE") {
      rankings(encounterID: $ENCOUNTER_ID, difficulty: $DIFFICULTY)
    }
  }
}
```

---

## 8. Report Player Details (specs, talents, gear)

```graphql
{
  reportData {
    report(code: "$CODE") {
      playerDetails(fightIDs: [$FIGHT_ID])
    }
  }
}
```

---

## 9. Report Events (detailed combat log)

```graphql
{
  reportData {
    report(code: "$CODE") {
      events(dataType: $DATA_TYPE, fightIDs: [$FIGHT_ID], sourceID: $SOURCE_ID, startTime: $START, endTime: $END, limit: 500) {
        data
        nextPageTimestamp
      }
    }
  }
}
```

Paginate by using `nextPageTimestamp` as the next `startTime`.

---

## 10. Guild Progression

```graphql
{
  guildData {
    guild(name: "$GUILD", serverSlug: "$SERVER", serverRegion: "$REGION") {
      name
      id
      faction { name }
      server { slug region { slug } }
      zoneRanking(zoneId: $ZONE_ID) {
        progress {
          worldRank { number percentile color }
          regionRank { number }
          serverRank { number }
        }
        speed {
          worldRank { number }
          regionRank { number }
        }
        completeRaidSpeed {
          worldRank { number }
          regionRank { number }
        }
      }
    }
  }
}
```

---

## 11. Guild Attendance

```graphql
{
  guildData {
    guild(name: "$GUILD", serverSlug: "$SERVER", serverRegion: "$REGION") {
      name
      attendance(zoneID: $ZONE_ID, limit: 25) {
        data {
          code
          startTime
          zone { name }
          players { name presence }
        }
        has_more_pages
        current_page
      }
    }
  }
}
```

---

## 12. Guild Reports

```graphql
{
  reportData {
    reports(guildName: "$GUILD", guildServerSlug: "$SERVER", guildServerRegion: "$REGION", zoneID: $ZONE_ID, limit: 10) {
      data {
        code
        title
        startTime
        endTime
        zone { name }
      }
      has_more_pages
    }
  }
}
```

---

## 13. World Data — Zones & Encounters

```graphql
{
  worldData {
    zones(expansion_id: $EXPANSION_ID) {
      id
      name
    }
  }
}
```

```graphql
{
  worldData {
    zone(id: $ZONE_ID) {
      name
      encounters { id name }
    }
  }
}
```

---

## 14. Rate Limit Check

```graphql
{
  rateLimitData {
    limitPerHour
    pointsSpentThisHour
    pointsResetIn
  }
}
```

---

## 15. Multi-Character Comparison

Use GraphQL aliases to compare multiple characters in one query:

```graphql
{
  characterData {
    char1: character(name: "$NAME1", serverSlug: "$SERVER1", serverRegion: "$REGION1") {
      name
      classID
      zoneRankings(zoneID: $ZONE_ID, difficulty: $DIFFICULTY)
    }
    char2: character(name: "$NAME2", serverSlug: "$SERVER2", serverRegion: "$REGION2") {
      name
      classID
      zoneRankings(zoneID: $ZONE_ID, difficulty: $DIFFICULTY)
    }
  }
}
```

---

## 16. Report with Master Data (player list)

Useful first step when analyzing a report — get the list of players and their IDs for targeted queries:

```graphql
{
  reportData {
    report(code: "$CODE") {
      title
      zone { name }
      masterData(translate: true) {
        actors(type: "Player") {
          id
          name
          subType
          server
        }
      }
      fights(killType: Encounters) {
        id
        name
        kill
        difficulty
      }
    }
  }
}
```

---

## Tips

- **Combine queries** to save API points: fetch character + zone data in one request using GraphQL aliases
- **Filter fights**: use `killType: Kills` to only see kills, `killType: Wipes` for wipes
- **Fight IDs**: get from the `fights` field first, then use specific `fightIDs` for tables/events
- **Player IDs**: get from `masterData.actors`, then use `sourceID`/`targetID` to filter tables/events
- **Pagination**: events are paginated — use `nextPageTimestamp` as the next query's `startTime`
- **M+ note**: for M+ dungeon rankings, use `metric: playerscore` with `zoneID` for the M+ season zone
