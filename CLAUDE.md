# Warcraft Helper

Claude Code skills for World of Warcraft raid analysis.

## Skills

- **`/warcraftlogs`** — Query the WarcraftLogs v2 GraphQL API for raid/M+ data.
- **`/raid-review`** — Analyze a raid log and produce mechanic-focused improvement feedback with video/guide resources.

Both live in `.claude/skills/` and are auto-discovered. Each skill has its own `SKILL.md` (instructions), `CLAUDE.md` (project context), and `references/` (query templates, schema, analysis guides).

## Project Structure

```
.claude/
  skills/
    warcraftlogs/       # General WCL API skill
      SKILL.md          # Skill definition and instructions
      CLAUDE.md         # Skill-level project context
      scripts/wcl.sh    # OAuth + GraphQL query runner (curl/jq)
      references/       # Query templates and API schema
      .env              # WCL_CLIENT_ID, WCL_CLIENT_SECRET (not committed)
    raid-review/        # Raid analysis skill (depends on warcraftlogs)
      SKILL.md
      CLAUDE.md
      references/       # Analysis framework and resource discovery
  settings.local.json   # Local permissions (not committed)
```

## Conventions

- **Credentials**: WCL API credentials go in `.claude/skills/warcraftlogs/.env`. Never commit this file.
- **Skill dependency**: `raid-review` depends on `warcraftlogs` — it uses its `wcl.sh` script and query templates.
- **Current content defaults**: When no expansion/raid is specified, default to the current tier. Current defaults are maintained in each skill's `SKILL.md`.
