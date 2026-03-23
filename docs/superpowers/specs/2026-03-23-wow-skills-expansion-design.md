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
- `parsing.md` — How to extract structured data from pages

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
- `parsing.md` — Data extraction guide, spec slug mappings

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

**Design principles:**
- Hub does not duplicate spoke logic — it calls them and synthesizes
- Each spoke remains independently callable for quick targeted queries
- Hub explains its reasoning ("Checking Raider.IO for your M+ data and Archon for current meta...")

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

## Out of Scope

- Real-time raid monitoring (all analysis is post-hoc)
- PvP-specific skills (could be added later)
- Blizzard API direct integration (guild rosters, achievements — future expansion)
- WeakAura/addon management
- Loot tracking or EPGP/loot council integration
