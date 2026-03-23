# Raider.IO Schema Reference

## ID Systems

Raider.IO uses its own internal IDs that differ from WarcraftLogs and Blizzard IDs:

| System | Midnight Expansion ID | Notes |
|--------|----------------------|-------|
| Raider.IO | `11` | Used for `expansion_id` parameter |
| WarcraftLogs | `7` | Used for GraphQL `expansion_id` fields |
| Blizzard API | `517` | Internal Blizzard expansion ID |

Always use `11` when calling `mythic-plus/static-data` for Midnight content.

---

## Current Season

- **Season slug**: `season-mn-1`
- **Season name**: MN Season 1 (Midnight Season 1)
- **Short name**: MN1
- **Expansion ID**: 11
- **Blizzard season ID**: 16
- **Season start**: 2026-03-24 (US), 2026-03-25 (EU/TW/KR/CN)

---

## M+ Dungeons (MN Season 1)

| Dungeon | Slug | Short | Timer | RIO ID | CM ID |
|---------|------|-------|-------|--------|-------|
| Algeth'ar Academy | `algethar-academy` | AA | 29m 00s | 14032 | 402 |
| Magisters' Terrace | `magisters-terrace` | MT | 34m 00s | 15829 | 558 |
| Maisara Caverns | `maisara-caverns` | MC | 33m 00s | 16395 | 560 |
| Nexus-Point Xenas | `nexuspoint-xenas` | NPX | 30m 00s | 16573 | 559 |
| Pit of Saron | `pit-of-saron` | POS | 30m 00s | 4813 | 556 |
| Seat of the Triumvirate | `seat-of-the-triumvirate` | SEAT | 35m 00s | 8910 | 239 |
| Skyreach | `skyreach` | SR | 28m 00s | 6988 | 161 |
| Windrunner Spire | `windrunner-spire` | WS | 33m 00s | 15808 | 557 |

Use the `slug` value for the `dungeon` parameter in `/mythic-plus/runs`.

---

## Response Shapes

### Base Character Profile

Returned by `GET /characters/profile` with no extra fields.

```json
{
  "name": "Toon",
  "race": "Blood Elf",
  "class": "Paladin",
  "active_spec_name": "Retribution",
  "active_spec_role": "DPS",
  "gender": "male",
  "faction": "horde",
  "achievement_points": 12345,
  "honorable_kills": 0,
  "thumbnail_url": "https://render.worldofwarcraft.com/...",
  "region": "us",
  "realm": "Illidan",
  "last_crawled_at": "2026-03-23T12:00:00.000Z",
  "profile_url": "https://raider.io/characters/us/illidan/Toon",
  "profile_banner": "profilemain2"
}
```

### mythic_plus_scores_by_season

Returned when `fields` includes `mythic_plus_scores_by_season:current`.

```json
{
  "mythic_plus_scores_by_season": [
    {
      "season": "season-mn-1",
      "scores": {
        "all": 2845.3,
        "dps": 2845.3,
        "healer": 0,
        "tank": 0,
        "spec_0": 2845.3,
        "spec_1": 0,
        "spec_2": 0,
        "spec_3": 0
      },
      "segments": {
        "all": { "score": 2845.3, "color": "#5880cb" },
        "dps": { "score": 2845.3, "color": "#5880cb" },
        "healer": { "score": 0, "color": "#ffffff" },
        "tank": { "score": 0, "color": "#ffffff" }
      }
    }
  ]
}
```

Key points:
- `scores.all` is the character's overall M+ score (what people refer to as "rio score").
- Per-role scores (`dps`, `healer`, `tank`) track the best score in each role.
- `spec_0` through `spec_3` are per-spec scores.
- `segments[].color` is the hex color for that score (matches score-tiers endpoint).

### mythic_plus_best_runs / mythic_plus_recent_runs / mythic_plus_highest_level_runs

All three fields return arrays of run objects with the same shape.

```json
{
  "mythic_plus_best_runs": [
    {
      "dungeon": "Skyreach",
      "short_name": "SR",
      "mythic_level": 15,
      "completed_at": "2026-03-20T22:15:00.000Z",
      "clear_time_ms": 1523000,
      "par_time_ms": 1680000,
      "num_keystone_upgrades": 2,
      "map_challenge_mode_id": 161,
      "zone_id": 6988,
      "score": 185.5,
      "affixes": [
        { "id": 10, "name": "Fortified", "description": "...", "icon": "ability_toughness", "wowhead_url": "..." },
        { "id": 9, "name": "Tyrannical", "description": "...", "icon": "...", "wowhead_url": "..." }
      ],
      "url": "https://raider.io/mythic-plus-runs/season-mn-1/..."
    }
  ]
}
```

Key points:
- `clear_time_ms` and `par_time_ms` are in milliseconds. Convert: `clear_time_ms / 1000 / 60` for minutes.
- `num_keystone_upgrades`: 0 = depleted, 1 = timed, 2 = +2, 3 = +3.
- `score` is the individual run's score contribution.
- `mythic_plus_best_runs` returns the best timed run per dungeon (up to 8 entries for 8 dungeons).
- `mythic_plus_highest_level_runs` includes depleted runs (untimed).
- `mythic_plus_recent_runs` returns the most recent runs regardless of dungeon.

### mythic_plus_ranks

```json
{
  "mythic_plus_ranks": {
    "overall": {
      "world": 15234,
      "region": 8912,
      "realm": 145
    },
    "class": {
      "world": 2345,
      "region": 1234,
      "realm": 23
    },
    "faction_overall": {
      "world": 8123,
      "region": 4567,
      "realm": 78
    },
    "faction_class": {
      "world": 1234,
      "region": 678,
      "realm": 12
    },
    "tank": { "world": 0, "region": 0, "realm": 0 },
    "healer": { "world": 0, "region": 0, "realm": 0 },
    "dps": { "world": 14890, "region": 8500, "realm": 140 },
    "class_tank": { "world": 0, "region": 0, "realm": 0 },
    "class_healer": { "world": 0, "region": 0, "realm": 0 },
    "class_dps": { "world": 2100, "region": 1100, "realm": 20 }
  }
}
```

Key points:
- Rank 0 means no data for that role (character hasn't played it).
- `overall` is the global ranking across all classes.
- `class` is the ranking within the character's class.
- `faction_*` variants rank within the character's faction only.

### gear

```json
{
  "gear": {
    "item_level_equipped": 639,
    "item_level_total": 641,
    "artifact_traits": 0,
    "corruption": { "added": 0, "resisted": 0, "total": 0 },
    "items": {
      "head": {
        "item_id": 12345,
        "item_level": 639,
        "icon": "inv_helm_...",
        "name": "Helm of Example",
        "item_quality": 4,
        "is_legendary": false,
        "gems": [],
        "bonuses": []
      },
      "neck": { "..." : "..." },
      "shoulder": { "..." : "..." },
      "back": { "..." : "..." },
      "chest": { "..." : "..." },
      "wrist": { "..." : "..." },
      "hands": { "..." : "..." },
      "waist": { "..." : "..." },
      "legs": { "..." : "..." },
      "feet": { "..." : "..." },
      "finger1": { "..." : "..." },
      "finger2": { "..." : "..." },
      "trinket1": { "..." : "..." },
      "trinket2": { "..." : "..." },
      "mainhand": { "..." : "..." },
      "offhand": { "..." : "..." }
    }
  }
}
```

### raid_progression

```json
{
  "raid_progression": {
    "vsldr-mqd": {
      "summary": "5/9 H",
      "total_bosses": 9,
      "normal_bosses_killed": 9,
      "heroic_bosses_killed": 5,
      "mythic_bosses_killed": 0
    }
  }
}
```

Key points:
- Keyed by raid slug (e.g. `vsldr-mqd`).
- `summary` is a human-readable string like `5/9 H` or `9/9 M`.

### Guild Profile

Returned by `GET /guilds/profile`.

```json
{
  "name": "Blood Legion",
  "faction": "horde",
  "region": "us",
  "realm": "Illidan",
  "profile_url": "https://raider.io/guilds/us/illidan/Blood+Legion",
  "raid_rankings": {
    "vsldr-mqd": {
      "normal": { "world": 1234, "region": 567, "realm": 12 },
      "heroic": { "world": 456, "region": 234, "realm": 5 },
      "mythic": { "world": 89, "region": 45, "realm": 1 }
    }
  },
  "raid_progression": {
    "vsldr-mqd": {
      "summary": "9/9 M",
      "total_bosses": 9,
      "normal_bosses_killed": 9,
      "heroic_bosses_killed": 9,
      "mythic_bosses_killed": 9
    }
  }
}
```

### Raid Rankings

Returned by `GET /raiding/raid-rankings`.

```json
{
  "raidRankings": {
    "rankedGuilds": [
      {
        "rank": 1,
        "region": { "name": "United States & Oceania", "slug": "us", "short_name": "US" },
        "guild": {
          "id": 12345,
          "name": "Liquid",
          "faction": "horde",
          "realm": { "id": 1, "name": "Illidan", "slug": "illidan", "... ": "..." },
          "region": { "name": "United States & Oceania", "slug": "us", "short_name": "US" },
          "path": "/guilds/us/illidan/Liquid",
          "logo": null
        },
        "encountersDefeated": [
          {
            "slug": "boss-slug",
            "lastDefeated": "2026-03-15T20:30:00.000Z",
            "firstDefeated": "2026-03-10T18:00:00.000Z"
          }
        ],
        "area": "World"
      }
    ]
  }
}
```

---

## Score Color Tiers

Raider.IO assigns a color to every M+ score on a continuous gradient. The exact score-to-color mapping varies per season and is returned by the `/mythic-plus/score-tiers` endpoint.

General color bands (approximate ranges, based on TWW Season 3 as reference -- MN Season 1 ranges will shift):

| Color | Approximate Score Range | Hex Example |
|-------|------------------------|-------------|
| Orange | 4300+ | `#ff8000` |
| Orange-Pink | 3800 - 4300 | `#f07050` |
| Pink-Purple | 3000 - 3800 | `#d04ab0` |
| Blue | 2500 - 3000 | `#4070dd` |
| Blue-Green | 2000 - 2500 | `#55a0a0` |
| Green | 1500 - 2000 | `#45ee45` |
| Light Green | 1000 - 1500 | `#80ff60` |
| Near-White | Below 1000 | `#d0ffc0` |

When presenting a score, use the `segments[].color` value from the character profile response for the exact color, or query `score-tiers` for the season's full gradient.

---

## Score Percentile Cutoffs

The `/mythic-plus/season-cutoffs` endpoint returns population-based percentile thresholds:

| Percentile | Meaning | Key (in response) |
|------------|---------|-------------------|
| Top 0.1% | Elite | `p999` |
| Top 1% | Very high | `p990` |
| Top 10% | High | `p900` |
| Top 25% | Above average | `p750` |
| Top 40% | Average+ | `p600` |

Each percentile object contains `all`, `horde`, and `alliance` sub-objects with:
- `quantileMinValue` -- the score threshold for that percentile
- `quantilePopulationCount` -- number of characters at or above
- `totalPopulationCount` -- total population tracked

### Achievement Thresholds

Fixed score targets (do not change per season):

| Achievement | Score | Key |
|-------------|-------|-----|
| Keystone Legend | 3000 | `keystoneLegend` |
| Keystone Hero | 2500 | `keystoneHero` |
| Keystone Master | 2000 | `keystoneMaster` |
| Keystone Conqueror | 1500 | `keystoneConqueror` |
| Keystone Explorer | 1000 | `keystoneExplorer` |

### All-Timed Score Targets

The response also includes `allTimed{N}` entries (e.g. `allTimed15`, `allTimed20`) showing the score you would earn by timing all 8 dungeons at key level N. Examples from MN Season 1:

| All Timed Level | Score |
|-----------------|-------|
| +2 | 1240 |
| +5 | 1720 |
| +10 | 2560 |
| +12 | 2920 |
| +15 | 3280 |
| +17 | 3520 |
| +20 | 3880 |
| +25 | 4480 |
| +29 | 4960 |

Use these to answer "what key level do I need to time for Keystone Master?" questions.
- Keystone Explorer (1000): below all-timed +2 -- just complete some keys
- Keystone Conqueror (1500): between all-timed +2 (1240) and +5 (1720)
- Keystone Master (2000): between all-timed +7 (2080) and +8 (2200)
- Keystone Hero (2500): between all-timed +9 (2320) and +10 (2560)
- Keystone Legend (3000): between all-timed +12 (2920) and +13 (3040)
