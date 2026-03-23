# Warcraft Helper

Workspace for World of Warcraft guild tools. Two skills are installed:

- **warcraftlogs** — Query the WarcraftLogs API for raid/M+ data. General-purpose WoW log queries.
- **raid-review** — Analyze a raid log and produce mechanic-focused improvement feedback with video/guide resources.

Both skills are in `.claude/skills/` and auto-discovered. Use `/warcraftlogs` or `/raid-review` to invoke them.

## Credentials

WCL API credentials live in `.claude/skills/warcraftlogs/.env` (WCL_CLIENT_ID, WCL_CLIENT_SECRET).
