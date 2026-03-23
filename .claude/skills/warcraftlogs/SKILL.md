---
name: warcraftlogs
description: Query the WarcraftLogs API to answer World of Warcraft raiding and Mythic+ questions. Use this skill whenever the user mentions WarcraftLogs, WCL, raid parses, boss rankings, M+ scores, log analysis, combat logs, guild progression, DPS/HPS rankings, percentiles, or any WoW performance-related question. Also use when the user pastes a warcraftlogs.com URL, mentions a character name + server in a WoW context, asks about raid tier rankings, spec performance, or wants to compare players. Even casual questions like "how did I do last night" or "what's the best healer spec right now" should trigger this skill if there's any WoW context.
---

# WarcraftLogs Skill

You have access to the WarcraftLogs v2 GraphQL API, which lets you pull real-time data about WoW raiding, Mythic+, character performance, combat log reports, and guild progression.

## Current Content Defaults

When the user doesn't specify a raid, dungeon season, or expansion, always default to the current content:

- **Expansion**: Midnight (expansion ID 7)
- **Current Raid**: VS / DR / MQD (zone ID 46, difficulty 5 for Mythic, 4 for Heroic)
  - Bosses: Imperator Averzian, Vorasius, Vaelgor & Ezzorak, Fallen-King Salhadaar, Lightblinded Vanguard, Crown of the Cosmos, Chimaerus the Undreamt God, Belo'ren Child of Al'ar, Midnight Falls
- **Current M+ Season**: Mythic+ Season 1 (zone ID 47)
- **Current M+ Dungeons**: Algeth'ar Academy, Magister's Terrace, Maisara Caverns, Nexus-Point Xenas, Pit of Saron, Seat of the Triumvirate, Skyreach, Windrunner Spire

If the user says "how are my parses" → query VS / DR / MQD Mythic by default.
If the user says "my M+ score" → query Midnight M+ Season 1 by default.
If the user mentions a specific older raid or season (e.g. Liberation of Undermine, TWW M+ Season 3), use that instead.

## How It Works

1. Figure out what the user is asking about
2. Pick a query template from `references/queries.md` or construct a custom query using `references/schema.md`
3. Execute via the bundled helper script: `<skill-path>/scripts/wcl.sh '<GRAPHQL_QUERY>'`
   - Optional second argument for variables: `<skill-path>/scripts/wcl.sh '<QUERY>' '{"name": "value"}'`
4. Interpret the results and present them clearly

The script handles OAuth authentication automatically (including retry on expired tokens). Credentials are read from environment variables (`WCL_CLIENT_ID`, `WCL_CLIENT_SECRET`) or from a `.env` file at `${CLAUDE_SKILL_DIR}/.env`.

## Identifying What to Query

### User gives a WarcraftLogs URL
Extract the report code from the URL: `https://www.warcraftlogs.com/reports/ABC123` → code is `ABC123`.
Start with the report overview query (template #4) to get fights, then drill into specific fights with tables, deaths, or rankings.

### User asks about a character
You need: character name, server slug (lowercase, hyphenated), and region (`us`, `eu`, `kr`, `tw`, `cn`).
If the user doesn't specify server/region, ask them. Common examples: `"illidan"/"us"`, `"tarren-mill"/"eu"`, `"ragnaros"/"eu"`.

### User asks about a guild
Same as character — need guild name, server slug, region.

### User asks a meta question ("what's the best spec")
This requires aggregating data. WarcraftLogs doesn't have a direct "best spec" API endpoint. Instead:
- For raid: look at character zone rankings across multiple well-known players, or reference what you know about the current meta and use specific character lookups to validate.
- For M+: look at zone rankings with `metric: playerscore` for high-performing characters.
- You can also suggest the user check the Archon tier lists on warcraftlogs.com, which aggregate this data at scale.

## Reading the Results

### Zone Rankings (`zoneRankings`)
Returns JSON with per-boss data. Key fields in the response:
- `bestAmount` — highest DPS/HPS value
- `medianPerformance` — median percentile across kills
- `rankPercent` — best percentile
- `allStars` — overall ranking across all bosses
  - `points`, `rank`, `regionRank`, `serverRank`, `possiblePoints`

Present percentiles with color context:
- 99-100: gold parse (exceptional)
- 95-98: pink parse (excellent)
- 75-94: orange parse (great)
- 50-74: purple parse (good)
- 25-49: blue parse (average)
- 0-24: gray parse (below average)

### Encounter Rankings (`encounterRankings`)
Returns JSON with individual kill details:
- `ranks[]` — each kill with `amount` (DPS/HPS), `duration`, `startTime`, `report { code, fightID }`, `bracketData`
- `bestAmount`, `medianPerformance`, `averagePerformance`
- `totalKills`

### Report Tables
Returns JSON with `entries[]` or `compositions[]`. Each entry has:
- `name`, `id`, `total`, `activeTime`, `activeTimeReduced`
- For damage: `abilities[]` with per-ability breakdowns
- For deaths: `deathEvents[]` with killing blow info

### Guild Zone Rankings (`zoneRanking`)
Each sub-field (`progress`, `speed`, `completeRaidSpeed`) contains:
- `worldRank { number percentile color }` — global rank
- `regionRank { number }` — region rank
- `serverRank { number }` — server rank

## Query Efficiency

The API has a 3600 points/hour rate limit. Be mindful:
- Combine related data into single queries using GraphQL's structure
- Use aliases to compare multiple characters in one request (template #15)
- Fetch report overview first, then drill into specific fights rather than loading everything
- Check rate limit (template #14) if you're doing many queries
- Cache the token (the script already does this)

When doing a multi-step analysis (like "analyze this log"), plan your queries:
1. First: report overview + master data (get fights and player IDs)
2. Then: specific fight tables/rankings based on what's interesting
3. Only fetch events if you need detailed timeline data (most expensive)

## Presenting Results

- Format numbers: DPS as `X.XXk` or `X.XXM`, durations as `Xm Xs`
- Show percentiles prominently — they're what players care about most
- Use tables for multi-boss comparisons
- When comparing characters, show side-by-side
- Timestamps from the API are Unix milliseconds — convert to readable dates
- For report analysis, summarize before diving into details: "This was a 3-hour raid session with 8/8 Normal kills and 5/8 Heroic, wiping 4 times on Sprocketmonger"

## Reference Files

- Read `references/queries.md` for ready-to-use query templates (covers ~80% of questions)
- Read `references/schema.md` for the full API schema when you need to construct custom queries
- The schema reference includes current zone IDs, encounter IDs, difficulty values, metric names, and enum values

## Handling Errors

- `null` character/guild result: name or server is wrong. Ask the user to double-check.
- `null` rankings: character may have no logs for that zone/difficulty, or rankings are hidden.
- Token error: credentials may be missing. Check that `.env` file exists at `${CLAUDE_SKILL_DIR}/.env`.
- Rate limit exceeded: tell the user to wait (check `pointsResetIn` from rate limit query).
- Archived report: older reports may require a subscription for event/table data.
