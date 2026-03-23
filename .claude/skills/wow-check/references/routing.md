# Intent Routing Rules

How the hub classifies user questions and routes them to spoke skills.

## Single-Spoke Routes

| Intent | Keywords / Patterns | Spoke |
|---|---|---|
| M+ score/profile | "m+ score", "rio score", "raider.io", "what keys", "push" | `/raiderio` |
| Spec tier list | "tier list", "what's meta", "best spec", "S tier" | `/archon` |
| Top player builds | "what are top players running", "murlok", "top 50" | `/murlok` |
| Sim/gear | "sim", "upgrade", "stat weights", "best gear", "top gear" | `/sim` |
| Raid parses | "parses", "logs", "percentile", "wcl" | `/warcraftlogs` |

## Multi-Spoke Routes

| Intent | Keywords / Patterns | Spokes |
|---|---|---|
| Build recommendation | "what build", "what talents", "best build for [boss]" | `/archon` + `/murlok` |
| Comp advice | "best comp", "what comp for" | `/archon` + `/raiderio` |
| Raid readiness | "raid ready", "ready for mythic" | `/raiderio` + `/sim` + `/warcraftlogs` |
| Full audit | "audit", "check me", "full check", character+realm only | All spokes |

## Ambiguous Queries

When intent is unclear, make a best guess based on available context, state the interpretation to the user, and let them redirect. Example:

> User: "How's my Frost Mage doing?"
> Hub: "I'll pull your M+ score and recent raid parses to give you an overview. If you meant something else (builds, sims, tier ranking), just say so."

## Character Resolution

Query Raider.IO first (fast, free, no credentials required) to resolve:
- Full character name and realm
- Class and current spec
- Item level
- M+ score and runs

Use the detected spec for downstream Archon and Murlok lookups. This avoids asking the user for information that can be fetched automatically.

## Spoke Invocation

Each spoke has its own `SKILL.md` with full instructions. Reference them at:
- `${CLAUDE_SKILL_DIR}/../raiderio/SKILL.md`
- `${CLAUDE_SKILL_DIR}/../archon/SKILL.md`
- `${CLAUDE_SKILL_DIR}/../murlok/SKILL.md`
- `${CLAUDE_SKILL_DIR}/../sim/SKILL.md`
- `${CLAUDE_SKILL_DIR}/../warcraftlogs/SKILL.md`

For API-based spokes, use their scripts directly:
- Raider.IO: `${CLAUDE_SKILL_DIR}/../raiderio/scripts/rio.sh`
- WarcraftLogs: `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh`
- SimCraft: `${CLAUDE_SKILL_DIR}/../sim/scripts/sim.sh`

For web-scraping spokes (Archon, Murlok), use the WebFetch tool as documented in their SKILL.md files.
