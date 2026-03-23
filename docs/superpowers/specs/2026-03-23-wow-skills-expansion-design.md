# WoW Skills Expansion — Design Spec

**Date:** 2026-03-23
**Status:** Approved

## Overview

Expand the warcraft-helper repo from 2 skills (warcraftlogs, raid-review) to 7 skills by adding 4 new data-source spokes and 1 hub/router skill. The goal is to support guild officers and competitive raiders with build guidance, gear optimization, M+ tracking, and meta awareness — all queryable through natural language via a single hub skill.

## Architecture

### Hub-and-Spoke Model

```
/wow-check (hub) ──→ /raiderio      (Raider.IO API)
                 ──→ /archon        (Archon.gg web data)
                 ──→ /murlok        (Murlok.io web data)
                 ──→ /sim           (SimHammer local + Raidbots read-only)
                 ──→ /warcraftlogs  (existing)

/raid-review ──→ /warcraftlogs (existing, unchanged)
```

Each spoke wraps a single data source and is independently usable. The hub orchestrates spokes based on user intent.

### Character Identity

All spokes that accept character input use a canonical format: **name + realm + region** (e.g., `Playername`, `Tichondrius`, `us`). The hub resolves this once and passes it to spokes. Mapping per spoke:

| Spoke | Identity Input | Notes |
|-------|---------------|-------|
| `/raiderio` | name, realm, region | Direct match |
| `/warcraftlogs` | name, server, region | Direct match |
| `/archon` | spec only (no character) | Hub detects spec from Raider.IO profile |
| `/murlok` | spec only (no character) | Hub detects spec from Raider.IO profile |
| `/sim` | SimC addon export string or armory import | Requires profile input from user or armory fetch |

For audit mode, the hub first queries Raider.IO to resolve the character's current spec, then uses that spec to query Archon and Murlok.

### Graceful Degradation

When a spoke fails (API down, Docker not running, site unreachable), the hub:
1. Proceeds with data from available spokes
2. Notes which sections are missing and why (e.g., "Sim section skipped — SimHammer not running")
3. Never fails the entire audit due to a single spoke failure

### Web Scraping Notes

`/archon` and `/murlok` use `WebFetch` (Claude Code MCP tool) rather than shell scripts. This is intentional — these sites have no stable API, so parsing logic lives in the skill's `references/parsing.md` as instructions for Claude to interpret the fetched content, rather than in brittle shell-based HTML parsing. Trade-off: these skills only work inside Claude Code, unlike the shell-script-based skills.

`WebFetch` returns rendered page content as text/markdown. If a target site requires JavaScript rendering and `WebFetch` returns empty/incomplete data, the skill should note the limitation and suggest the user check the site directly.

Each `parsing.md` file should include a "last verified" date. If parsing returns empty or unexpected results, the skill should warn the user rather than silently producing incomplete output.

## Spoke Skills

### 1. `/raiderio` — Raider.IO API

**Source:** `https://raider.io/api/v1/` (free, public, no auth)

**Capabilities:**
- Character M+ profile (score, best runs per dungeon, score color)
- M+ run history (recent runs, weekly keys)
- Score gap analysis ("you need a +12 Tidesmith's Reef to hit 2500")
- Dungeon rankings (realm/region/world)
- Season best runs and alt tracking
- Team/group lookup (who ran what together)

**Script:** `rio.sh` — curl wrapper, no auth needed. No caching required (API is fast and free).

**References:**
- `endpoints.md` — API endpoint documentation and parameter reference
- `schema.md` — Response shapes, score calculation, current season dungeon list

**Auth:** None required.

**File structure:**
```
.claude/skills/raiderio/
  SKILL.md
  CLAUDE.md
  scripts/rio.sh
  references/
    endpoints.md
    schema.md
```

---

### 2. `/archon` — Archon.gg Meta Data

**Source:** Archon.gg (web fetch/scrape)

**Capabilities:**
- Spec tier lists by content type (raid, M+, PvP)
- Meta talent builds per spec per content type
- Comp popularity and win rates for M+ key levels
- Stat priority guidance per spec
- Patch-aware (data updates with each tuning pass)

**Data access:** Uses `WebFetch` to pull Archon pages and extract structured data. Research needed during implementation to determine if Archon exposes a hidden API or if HTML parsing is required.

**References:**
- `urls.md` — URL patterns for tier lists, builds, comp data
- `parsing.md` — How to extract structured data from pages (implementation deliverable — created during build based on site research)

**Error handling:** If `WebFetch` returns empty or unparseable content (site down, layout changed, JS-only rendering), warn the user with the specific failure and suggest checking Archon directly. Never silently return incomplete data.

**Auth:** None required.

**File structure:**
```
.claude/skills/archon/
  SKILL.md
  CLAUDE.md
  references/
    urls.md
    parsing.md
```

---

### 3. `/murlok` — Murlok.io Top Player Data

**Source:** Murlok.io (web fetch/scrape)

**Capabilities:**
- What top players (title-range / top 0.1%) are actually running per spec
- Talent builds with popularity percentages
- Gear choices (trinkets, tier sets, embellishments)
- Enchants, gems, and consumables
- Breakdowns by content type (raid vs M+) and key level ranges

**Key distinction from Archon:** Archon says "what's theoretically best." Murlok says "what the best players are actually using." They diverge on niche specs or when sims haven't caught up to player discoveries. Both are valuable.

**Data access:** Uses `WebFetch`. Murlok.io is relatively structured — good candidate for reliable parsing.

**References:**
- `urls.md` — URL patterns per spec, content type, key range
- `parsing.md` — Data extraction guide, spec slug mappings (implementation deliverable — created during build based on site research)

**Error handling:** Same as `/archon` — warn on empty/unparseable results, never silently fail.

**Auth:** None required.

**File structure:**
```
.claude/skills/murlok/
  SKILL.md
  CLAUDE.md
  references/
    urls.md
    parsing.md
```

---

### 4. `/sim` — SimulationCraft + Raidbots Read-Only

**Primary source:** Local SimulationCraft via [sortbek/simcraft](https://github.com/sortbek/simcraft) (SimHammer) Docker container, exposing a REST API on port 8000.

**Secondary source:** Raidbots public read-only endpoints (no auth).

| Backend | Use Case | Auth |
|---------|----------|------|
| SimHammer (local) | Primary sim engine — gear comparison, stat weights, top gear, talent sims | None (localhost:8000) |
| Raidbots read-only | Fetch existing sim reports, pull static game data (item DB, talents) | None |

**Capabilities:**
- Gear comparison ("is this trinket an upgrade?")
- Stat weights for current gear set
- Top gear / best combination from bags
- Talent comparison (sim two builds head-to-head)
- Vault targeting ("which vault slot gives the highest expected upgrade?")
- Profile import from Blizzard armory or SimC addon export
- Fetch results of previously-run Raidbots sims by report ID
- Pull static game data (items, talents, enchants) from Raidbots CDN

**Scripts:**
- `sim.sh` — SimHammer REST API wrapper (submit sim, poll status, fetch results)
- `raidbots.sh` — Fetch public report data and static game data

**References:**
- `simhammer-api.md` — SimHammer REST endpoint documentation
- `raidbots-data.md` — Public Raidbots endpoints (reports, static data)
- `simc-input.md` — SimC profile format, addon export instructions

**Auth:** `SIMHAMMER_URL` in `.env` (defaults to `http://localhost:8000`).

**Setup requirement:** Docker + `sortbek/simcraft` image. Skill should detect if Docker/image is available and give clear setup instructions if not.

**Sim execution:** SimHammer runs SimC as a local subprocess — sims typically complete in 10-60 seconds. The `sim.sh` script should poll the SimHammer API every 5 seconds with a maximum timeout of 5 minutes. If a sim exceeds the timeout, report what's known and suggest the user check SimHammer directly. The SimHammer API shape (endpoints, input/output formats) must be researched during implementation by inspecting the sortbek/simcraft source — `simhammer-api.md` is an implementation deliverable.

**Raidbots public endpoints:** These are currently accessible without auth but are not officially documented. If they become restricted, the skill should fall back to SimHammer-only mode and note the limitation.

**File structure:**
```
.claude/skills/sim/
  SKILL.md
  CLAUDE.md
  scripts/
    sim.sh
    raidbots.sh
  references/
    simhammer-api.md
    raidbots-data.md
    simc-input.md
  .env
```

## Hub Skill

### `/wow-check` — Smart Router & Character Audit

**Purpose:** Natural language router that interprets WoW questions and orchestrates the right spoke(s) to answer them. Also performs full character audits combining all sources.

**Routing logic:**

| Question Pattern | Spokes Used |
|---|---|
| "How's my M+ score?" / "What keys do I need?" | `/raiderio` |
| "What's the meta for frost mage?" / "Best M+ specs?" | `/archon` |
| "What are top players running on my spec?" | `/murlok` |
| "Is this trinket an upgrade?" / "Sim my character" | `/sim` |
| "Full audit of CharName-Realm" | All spokes |
| "What build should I run for Boss X?" | `/archon` + `/murlok` |
| "What comp for a +15 key?" | `/archon` + `/raiderio` |
| "Am I raid ready?" | `/raiderio` + `/sim` + `/warcraftlogs` |

**Full character audit mode:**

When given a character + realm (or asked "check me" / "audit"), runs all spokes and produces:

```
## Character Audit: Playername - Realm

### M+ Standing (Raider.IO)
Score, rank, best runs, score gaps, missing dungeons

### Build Check (Archon + Murlok)
Current build vs meta recommendation
Where build diverges from top players
Per-slot: talents, enchants, gems flagged if off-meta

### Gear Optimization (SimCraft)
Stat weights for current gear
Top upgrade opportunities
Vault targeting recommendation

### Recent Performance (WarcraftLogs)
Latest raid parses, trend direction
Notable mechanic issues from recent logs
```

**Hub and `/raid-review`:** The hub calls `/warcraftlogs` directly for the "Recent Performance" section (recent parses, trend). It does NOT invoke `/raid-review` — that skill is a full raid-log analysis pipeline with a different scope. If the user wants deep mechanic analysis, they invoke `/raid-review` separately.

**Design principles:**
- Hub does not duplicate spoke logic — it calls them and synthesizes
- Each spoke remains independently callable for quick targeted queries
- Hub explains its reasoning ("Checking Raider.IO for your M+ data and Archon for current meta...")
- For ambiguous queries, hub makes a best guess and states its interpretation ("I'm reading this as a build question — checking Archon and Murlok"). User can redirect if wrong.

**References:**
- `routing.md` — Intent classification rules and spoke mapping
- `audit-template.md` — Full audit output format and section structure

**File structure:**
```
.claude/skills/wow-check/
  SKILL.md
  CLAUDE.md
  references/
    routing.md
    audit-template.md
```

## Credential Summary

| Skill | Needs `.env`? | Contents |
|---|---|---|
| `/warcraftlogs` | Yes (existing) | `WCL_CLIENT_ID`, `WCL_CLIENT_SECRET` |
| `/raiderio` | No | Free public API |
| `/archon` | No | Web fetch, no auth |
| `/murlok` | No | Web fetch, no auth |
| `/sim` | Yes | `SIMHAMMER_URL` (default `http://localhost:8000`) |
| `/wow-check` | No | Uses spoke credentials |

## Dependency Graph

```
wow-check → raiderio, archon, murlok, sim, warcraftlogs
raid-review → warcraftlogs
sim → SimHammer Docker (must be running for sim features)
warcraftlogs → WCL OAuth credentials
```

## Build Sequence

Recommended implementation order (each skill is independently testable):

1. **`/raiderio`** — Simplest (free API, no auth, curl wrapper). Quick win.
2. **`/murlok`** — Web fetch based. Straightforward parsing.
3. **`/archon`** — Web fetch based. May need more parsing research.
4. **`/sim`** — Requires SimHammer Docker setup. Most complex spoke.
5. **`/wow-check`** — Hub skill. Requires all spokes to exist first.

## Post-Implementation Cleanup

- Update project-level `CLAUDE.md` to list all 7 skills and updated project structure
- Update `README.md` with setup instructions for new skills (SimHammer Docker, etc.)

## Out of Scope

- Real-time raid monitoring (all analysis is post-hoc)
- PvP-specific skills (could be added later)
- Blizzard API direct integration (guild rosters, achievements — future expansion)
- WeakAura/addon management
- Loot tracking or EPGP/loot council integration
