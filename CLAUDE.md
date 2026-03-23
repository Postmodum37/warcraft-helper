# Warcraft Helper

Claude Code skills for World of Warcraft raid analysis, character audits, and theorycraft.

## Skills

- **`/warcraftlogs`** — Query the WarcraftLogs v2 GraphQL API for raid/M+ data.
- **`/raid-review`** — Analyze a raid log and produce mechanic-focused improvement feedback with video/guide resources.
- **`/raiderio`** — Query the Raider.IO API for M+ scores, run history, rankings, and character profiles.
- **`/archon`** — Fetch spec tier lists, meta builds, gear, and stat priorities from Archon.gg.
- **`/murlok`** — Look up what top players are actually running from Murlok.io (M+ and PvP).
- **`/sim`** — Run SimulationCraft simulations via SimHammer and fetch Raidbots data.
- **`/wow-check`** — Smart router that answers any WoW question by routing to the right skill(s). Full character audits.

All skills live in `.claude/skills/` and are auto-discovered. Each skill has its own `SKILL.md` (instructions), `CLAUDE.md` (project context), and `references/` (query templates, schema, analysis guides).

## Project Structure

```
.claude/
  skills/
    warcraftlogs/       # WarcraftLogs v2 GraphQL API
      SKILL.md
      CLAUDE.md
      scripts/wcl.sh    # OAuth + GraphQL query runner (curl/jq)
      references/       # Query templates and API schema
      .env              # WCL_CLIENT_ID, WCL_CLIENT_SECRET (not committed)
    raid-review/        # Raid log analysis (depends on warcraftlogs)
      SKILL.md
      CLAUDE.md
      references/       # Analysis framework and resource discovery
    raiderio/           # Raider.IO API (M+ scores, rankings)
      SKILL.md
      CLAUDE.md
      scripts/rio.sh    # REST API query runner (curl/jq)
      references/       # Endpoint catalog and response schema
    archon/             # Archon.gg (tier lists, builds, gear)
      SKILL.md
      CLAUDE.md
      references/       # URL patterns and HTML parsing guide
    murlok/             # Murlok.io (top player builds, M+ and PvP)
      SKILL.md
      CLAUDE.md
      references/       # URL patterns and WASM/HTML parsing guide
    sim/                # SimulationCraft via SimHammer + Raidbots data
      SKILL.md
      CLAUDE.md
      scripts/sim.sh    # SimHammer API client
      scripts/raidbots.sh  # Raidbots static data fetcher
      references/       # SimHammer API, Raidbots data, SimC input format
      .env              # SIMHAMMER_URL (not committed)
      .env.example
    wow-check/          # Smart router / character audit orchestrator
      SKILL.md
      CLAUDE.md
      references/       # Routing logic and audit template
  settings.local.json   # Local permissions (not committed)
```

## Conventions

- **Credentials**: WCL API credentials go in `.claude/skills/warcraftlogs/.env`. SimHammer URL goes in `.claude/skills/sim/.env`. Never commit `.env` files.
- **Skill dependency**: `raid-review` depends on `warcraftlogs` — it uses its `wcl.sh` script and query templates. `wow-check` orchestrates all other skills.
- **No-setup skills**: `raiderio`, `archon`, and `murlok` use public APIs or web scraping and need no credentials.
- **Current content defaults**: When no expansion/raid is specified, default to the current tier. Current defaults are maintained in each skill's `SKILL.md`.
