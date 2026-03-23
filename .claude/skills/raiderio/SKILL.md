---
name: raiderio
description: Query the Raider.IO API for Mythic+ scores, run history, dungeon rankings, character profiles, and guild data. Use this skill when the user asks about M+ scores, key levels, dungeon runs, push targets, Raider.IO profiles, M+ rankings, weekly keys, or asks "what keys do I need". Also use when the user mentions raider.io, rio score, or asks about M+ meta/comps based on leaderboard data.
---

# Raider.IO Skill

You have access to the Raider.IO API, which provides real-time data about Mythic+ scores, run history, leaderboards, dungeon rankings, character profiles, guild progression, current affixes, and score percentile cutoffs.

## Current Content Defaults

When the user doesn't specify a season or expansion, always default to the current content:

- **Expansion**: Midnight (expansion ID 11)
- **Current M+ Season**: MN Season 1 (slug: `season-mn-1`)
- **Current M+ Dungeons**: Algeth'ar Academy (AA), Magisters' Terrace (MT), Maisara Caverns (MC), Nexus-Point Xenas (NPX), Pit of Saron (POS), Seat of the Triumvirate (SEAT), Skyreach (SR), Windrunner Spire (WS)

If the user says "what's my rio" or "my M+ score" -> query their character profile with `mythic_plus_scores_by_season:current`.
If the user says "what keys should I run" -> query best runs and compare against target score.
If the user says "what are the affixes" -> query `mythic-plus/affixes`.
If the user mentions a specific older season (e.g. TWW Season 3), use that season slug instead (e.g. `season-tww-3`).

## How It Works

1. Figure out what the user is asking about
2. Pick the right endpoint from `references/endpoints.md`
3. Execute via the bundled helper script: `<skill-path>/scripts/rio.sh <endpoint> [param=value ...]`
4. Interpret the results using response shapes from `references/schema.md`

The API is free and public -- no authentication or credentials needed.

## Identifying What to Query

### User asks about a character's M+ profile
You need: character name, realm slug, and region (`us`, `eu`, `kr`, `tw`, `cn`).
If the user doesn't specify realm/region, ask them.

Start with the character profile using multiple fields:
```bash
rio.sh characters/profile region=us realm=illidan name=Toon \
  fields=mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_ranks,gear
```

### User asks about score gap / push targets
Query the character's best runs and scores, then compare against their target:
1. Get current score and best runs per dungeon
2. Identify dungeons with the lowest key levels or missing runs
3. Calculate the score gain from upgrading each dungeon
4. Suggest which dungeons to push for maximum score improvement

Use `mythic_plus_best_runs` (best timed) and `mythic_plus_highest_level_runs` (includes depleted) to see the full picture.

### User asks about M+ leaderboards
Use `mythic-plus/runs` to browse top runs:
```bash
rio.sh mythic-plus/runs season=season-mn-1 region=world dungeon=all affixes=all page=0
```
Filter by dungeon slug for dungeon-specific leaderboards.

### User asks about guild data
Use `guilds/profile` with fields:
```bash
rio.sh guilds/profile region=us realm=illidan name=Blood+Legion \
  fields=members,raid_progression,raid_rankings
```

### User asks about current affixes
```bash
rio.sh mythic-plus/affixes region=us
```

### User asks about score percentiles or "how good is X score"
Query season cutoffs to contextualize a score:
```bash
rio.sh mythic-plus/season-cutoffs season=season-mn-1 region=us
```

### User asks about raid rankings
Use `raiding/raid-rankings`:
```bash
rio.sh raiding/raid-rankings raid=vsldr-mqd difficulty=mythic region=world page=0
```

## Presenting Results

### Scores
- Always show the score with its color. Use the `segments[].color` hex from the profile response.
- Format: "**2,845** M+ score" (with comma separator for readability).
- When relevant, mention the color tier: "2,845 (purple range)" to give players intuitive context.

### Run Times
- Convert `clear_time_ms` to minutes and seconds: `1523000ms` -> `25m 23s`.
- Show the timer comparison: `25m 23s / 29m 00s (+2)` to indicate the run was timed with a +2 upgrade.
- `num_keystone_upgrades`: 0 = depleted (over time), 1 = timed, 2 = +2, 3 = +3.

### Key Level Upgrades
- When showing what keys to push, present as a table:

| Dungeon | Current Best | Target | Score Gain |
|---------|-------------|--------|------------|
| Skyreach | +14 (timed) | +15 | +12.5 |
| Pit of Saron | +12 (timed) | +14 | +25.0 |

### Score Gaps
- For "what do I need for Keystone Master" questions, reference the `allTimed{N}` data from schema.md.
- Show the gap: "You need 2,000 for KSM. You're at 1,850. You need ~150 more points."
- Suggest specific upgrades: "Pushing your lowest dungeon from +10 to +12 would give you approximately the points you need."

### Rankings
- Show world/region/realm rank with context: "Rank 8,912 in US (top ~5% of tracked players)".
- Use `mythic_plus_ranks` for this data.

### Guild Data
- Show raid progression prominently: "9/9 H, 3/9 M".
- For member lists, summarize by role and average score rather than dumping the full roster.

## Reference Files

- Read `references/endpoints.md` for endpoint parameters and example rio.sh calls
- Read `references/schema.md` for response shapes, dungeon data, score tiers, and cutoff thresholds

## Handling Errors

- **Character not found**: Name or realm is wrong. Ask the user to double-check. Common issues: realm names with spaces need hyphens (e.g. `area-52`), special characters in names.
- **No M+ data**: Character exists but has no M+ runs this season. Scores will be 0. Tell the user they have no tracked runs yet.
- **API error (HTTP 4xx/5xx)**: The Raider.IO API may be temporarily down. Suggest the user try again in a few minutes or check raider.io directly.
- **Empty score tiers / cutoffs**: Early in a season, score tiers may return `null` values. Mention that the season is new and data is still populating.
- **Guild not found**: Guild names with spaces need `+` or `%20` encoding. Verify the guild name and realm are correct.
