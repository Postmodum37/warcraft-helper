# Raid Review

Raid review tool for World of Warcraft guilds. Analyzes WarcraftLogs reports and provides mechanic-focused improvement feedback with linked video/guide resources.

## Skill

The main skill is defined in `SKILL.md`. It orchestrates:
1. WarcraftLogs API queries (via `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh`)
2. Log analysis using `references/analysis-guide.md`
3. Web search for resources using `references/resource-sources.md`

## Dependencies

- **warcraftlogs skill** — sibling skill at `${CLAUDE_SKILL_DIR}/../warcraftlogs/`
  - `scripts/wcl.sh` — API query execution (OAuth + GraphQL)
  - `references/queries.md` — query templates (#4, #5, #6, #7, #14, #16)
  - `references/schema.md` — full GraphQL schema
- **WCL credentials** — `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` in env vars or `${CLAUDE_SKILL_DIR}/../warcraftlogs/.env`

## Current Content

Defers to the warcraftlogs skill for current raid/zone IDs. Currently:
- Raid: VS / DR / MQD (zone ID 46, difficulty 3 for Normal, 4 for Heroic, 5 for Mythic)
- Expansion: Midnight (ID 7)
