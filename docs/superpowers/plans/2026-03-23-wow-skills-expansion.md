# WoW Skills Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 new data-source skills (raiderio, archon, murlok, sim) and 1 hub/router skill (wow-check) to the warcraft-helper repo.

**Architecture:** Hub-and-spoke model. Each spoke wraps one external data source with its own SKILL.md, CLAUDE.md, scripts, and references. The wow-check hub routes natural language queries to the appropriate spoke(s) and produces unified answers. Follows existing skill patterns established by warcraftlogs and raid-review.

**Tech Stack:** Bash/curl/jq (scripts), Claude Code skills (SKILL.md/CLAUDE.md), WebFetch (web-scraped skills), Docker (SimHammer)

**Spec:** `docs/superpowers/specs/2026-03-23-wow-skills-expansion-design.md`

---

## File Structure

### New files to create:

**`/raiderio` skill (API-based, shell script):**
- `.claude/skills/raiderio/SKILL.md` — Skill definition, trigger description, instructions
- `.claude/skills/raiderio/CLAUDE.md` — Skill context, current season defaults
- `.claude/skills/raiderio/scripts/rio.sh` — curl wrapper for Raider.IO API
- `.claude/skills/raiderio/references/endpoints.md` — API endpoint documentation
- `.claude/skills/raiderio/references/schema.md` — Response shapes, season slugs, dungeon list

**`/archon` skill (WebFetch-based, server-side rendered HTML):**
- `.claude/skills/archon/SKILL.md` — Skill definition, trigger description, instructions
- `.claude/skills/archon/CLAUDE.md` — Skill context, current content defaults
- `.claude/skills/archon/references/urls.md` — URL patterns for tier lists and builds
- `.claude/skills/archon/references/parsing.md` — Data extraction instructions

**`/murlok` skill (WebFetch-based, WASM limitation noted):**
- `.claude/skills/murlok/SKILL.md` — Skill definition, trigger description, instructions
- `.claude/skills/murlok/CLAUDE.md` — Skill context, limitations
- `.claude/skills/murlok/references/urls.md` — URL patterns per spec/mode
- `.claude/skills/murlok/references/parsing.md` — Data extraction guide with WASM workaround

**`/sim` skill (Docker API + Raidbots read-only):**
- `.claude/skills/sim/SKILL.md` — Skill definition, trigger description, instructions
- `.claude/skills/sim/CLAUDE.md` — Skill context, setup requirements
- `.claude/skills/sim/scripts/sim.sh` — SimHammer REST API wrapper
- `.claude/skills/sim/scripts/raidbots.sh` — Raidbots public endpoint fetcher
- `.claude/skills/sim/references/simhammer-api.md` — SimHammer endpoint docs (research deliverable)
- `.claude/skills/sim/references/raidbots-data.md` — Public Raidbots endpoints
- `.claude/skills/sim/references/simc-input.md` — SimC profile format guide
- `.claude/skills/sim/.env` — `SIMHAMMER_URL=http://localhost:8000`
- `.claude/skills/sim/.gitignore` — Excludes .env

**`/wow-check` hub skill (orchestrator):**
- `.claude/skills/wow-check/SKILL.md` — Skill definition, routing logic, audit pipeline
- `.claude/skills/wow-check/CLAUDE.md` — Skill context, spoke dependencies
- `.claude/skills/wow-check/references/routing.md` — Intent → spoke mapping rules
- `.claude/skills/wow-check/references/audit-template.md` — Full audit output format

### Files to modify:
- `CLAUDE.md` — Add new skills to project structure and skill list
- `README.md` — Add setup instructions for new skills

---

## Task 1: `/raiderio` Skill — Script

**Files:**
- Create: `.claude/skills/raiderio/scripts/rio.sh`

- [ ] **Step 1: Create rio.sh script**

```bash
#!/usr/bin/env bash
# rio.sh — Raider.IO API helper
# Usage: ./rio.sh <endpoint> [param=value ...]
# Example: ./rio.sh characters/profile region=us realm=illidan name=Toon fields=mythic_plus_scores_by_season:current
#
# No auth required. Free public API.

set -euo pipefail

BASE_URL="https://raider.io/api/v1"

if [[ $# -lt 1 ]]; then
  echo "Usage: rio.sh <endpoint> [param=value ...]" >&2
  echo "Endpoints: characters/profile, guilds/profile, mythic-plus/runs, mythic-plus/affixes," >&2
  echo "           mythic-plus/static-data, mythic-plus/season-cutoffs, mythic-plus/score-tiers," >&2
  echo "           raiding/raid-rankings" >&2
  exit 1
fi

endpoint="$1"
shift

# Build query string from remaining args
query=""
for arg in "$@"; do
  if [[ -n "$query" ]]; then
    query="${query}&${arg}"
  else
    query="${arg}"
  fi
done

url="${BASE_URL}/${endpoint}"
if [[ -n "$query" ]]; then
  url="${url}?${query}"
fi

response=$(curl -s -w "\n%{http_code}" "$url")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" -ge 400 ]]; then
  echo "Error: Raider.IO returned HTTP $http_code" >&2
  echo "$body" >&2
  exit 1
fi

echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
```

- [ ] **Step 2: Make executable and test**

Run: `chmod +x .claude/skills/raiderio/scripts/rio.sh`

Test with a known character:
```bash
.claude/skills/raiderio/scripts/rio.sh characters/profile region=us realm=illidan name=Dsjr fields=mythic_plus_scores_by_season:current,mythic_plus_best_runs
```
Expected: JSON response with character profile, M+ scores, and best runs.

Test error handling:
```bash
.claude/skills/raiderio/scripts/rio.sh characters/profile region=us realm=fakefakerealm name=Nobodyxyz
```
Expected: HTTP 400 error message to stderr, exit code 1.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/raiderio/scripts/rio.sh
git commit -m "feat: add rio.sh script for Raider.IO API queries"
```

---

## Task 2: `/raiderio` Skill — References

**Files:**
- Create: `.claude/skills/raiderio/references/endpoints.md`
- Create: `.claude/skills/raiderio/references/schema.md`

- [ ] **Step 1: Write endpoints.md**

Document all 8 confirmed Raider.IO API endpoints with their parameters and usage examples. Structure:

```markdown
# Raider.IO API Endpoints

Base URL: `https://raider.io/api/v1`
Auth: None required (free public API)
Method: GET for all endpoints

---

## 1. Character Profile

`GET /characters/profile`

| Parameter | Required | Description |
|-----------|----------|-------------|
| `region` | Yes | `us`, `eu`, `kr`, `tw`, `cn` |
| `realm` | Yes | Realm slug (lowercase, hyphenated) |
| `name` | Yes | Character name |
| `fields` | No | Comma-separated extra fields |

Available fields: `mythic_plus_scores_by_season:current`, `mythic_plus_best_runs`, `mythic_plus_recent_runs`, `mythic_plus_highest_level_runs`, `mythic_plus_weekly_highest_level_runs`, `mythic_plus_ranks`, `gear`, `guild`, `raid_progression`

Example:
```
rio.sh characters/profile region=us realm=illidan name=Toon fields=mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_ranks,gear
```

[Continue for all 8 endpoints: characters/profile, guilds/profile, mythic-plus/runs, mythic-plus/affixes, mythic-plus/static-data, mythic-plus/season-cutoffs, mythic-plus/score-tiers, raiding/raid-rankings]
```

Include the full parameter tables, example rio.sh calls, and notes for each endpoint from the research data.

**To populate remaining endpoints:** The research data (available in the spec review context) contains full documentation for all 8 endpoints: `characters/profile`, `guilds/profile`, `mythic-plus/runs`, `mythic-plus/affixes`, `mythic-plus/static-data`, `mythic-plus/season-cutoffs`, `mythic-plus/score-tiers`, `raiding/raid-rankings`. Write each one with the same level of detail as the character profile example above.

- [ ] **Step 2: Write schema.md**

Document response shapes, current season data, and key enumerations.

**To populate current season data:** Run `rio.sh mythic-plus/static-data expansion_id=11` and use the response to fill in current dungeon names, slugs, and short names. If expansion_id 11 is not recognized, try `expansion_id=7` (the spec uses expansion ID 7 for Midnight in WarcraftLogs context — note that Raider.IO and WarcraftLogs use different ID systems).

```markdown
# Raider.IO Schema Reference

## ID System Note

Raider.IO uses its own expansion IDs (e.g., 10 for TWW, 11 for Midnight) which differ from WarcraftLogs zone IDs (e.g., zone 46 for the current raid). Always use the correct ID for each API.

## Current Season

- Season slug: `season-mn-1` (Midnight Season 1) — verify via static-data endpoint
- Expansion ID: 11 (for Raider.IO static-data) — verify, may differ
- Raid tier slug: `tier-mn-1`

## M+ Dungeons (Midnight Season 1)

Populate by running: `rio.sh mythic-plus/static-data expansion_id=11`
List each dungeon with: name, slug, short_name, keystone_timer_ms

## Response Shapes

### Character Profile (base)
Fields: name, race, class, active_spec_name, active_spec_role, gender, faction, achievement_points, region, realm, last_crawled_at, profile_url

### mythic_plus_scores_by_season
scores: { all, dps, healer, tank, spec_0..spec_3 } — each a float
segments: { all, dps, healer, tank, spec_0..spec_3 } — each { score, color (hex) }

### mythic_plus_best_runs / recent_runs
[Document run object: dungeon, short_name, mythic_level, completed_at, clear_time_ms, par_time_ms, num_keystone_upgrades, score, affixes, url]

### mythic_plus_ranks
[Document rank object: overall, class, dps/healer/tank, class_dps/healer/tank — each with world/region/realm]

### gear
[Document gear object: item_level_equipped, items by slot with item_id, item_level, name, gems, enchants]

### raid_progression
[Document per-tier: summary string, total/normal/heroic/mythic bosses killed]

## Score Color Tiers
[Document score→color mapping: 3200+ orange, 2500+ purple, 2000+ blue, 1500+ green, 0+ white]

## Score Percentile Cutoffs
[Document p999, p990, p900, p750, p600 with score thresholds]
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/raiderio/references/
git commit -m "feat: add Raider.IO API endpoint and schema reference docs"
```

---

## Task 3: `/raiderio` Skill — Skill Definition

**Files:**
- Create: `.claude/skills/raiderio/SKILL.md`
- Create: `.claude/skills/raiderio/CLAUDE.md`

- [ ] **Step 1: Write SKILL.md**

Follow the exact pattern from `.claude/skills/warcraftlogs/SKILL.md`. Key sections:

```markdown
---
name: raiderio
description: Query the Raider.IO API for Mythic+ scores, run history, dungeon rankings, character profiles, and guild data. Use this skill when the user asks about M+ scores, key levels, dungeon runs, push targets, Raider.IO profiles, M+ rankings, weekly keys, or asks "what keys do I need". Also use when the user mentions raider.io, rio score, or asks about M+ meta/comps based on leaderboard data.
---

# Raider.IO Skill

You have access to the Raider.IO API, which provides real-time Mythic+ data including scores, run history, rankings, and character/guild profiles.

## Current Content Defaults

- **Season:** Midnight Season 1 (slug: `season-mn-1`)
- **Expansion ID:** 11 (for static-data)
- **Raid tier:** `tier-mn-1`
- **Dungeons:** [list from static-data]

## How It Works

1. Figure out what the user is asking about
2. Pick the right endpoint from `references/endpoints.md`
3. Execute via: `<skill-path>/scripts/rio.sh <endpoint> [params...]`
4. Interpret results using `references/schema.md`

## Identifying What to Query

### User asks about their M+ score / profile
Need: character name, realm, region.
Fetch: `characters/profile` with `fields=mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_ranks`

### User asks "what keys do I need" / score gap analysis
Fetch the character's best runs, identify dungeons with the lowest scores or missing runs, calculate what key level would close the gap. The score for each dungeon contributes to the total — the weakest dungeons offer the most score improvement.

### User asks about M+ leaderboards / top runs
Use `mythic-plus/runs` endpoint with season, region, dungeon filters.

### User asks about guild M+ / raid rankings
Use `guilds/profile` with `fields=raid_rankings,raid_progression,members`.

### User asks about current affixes
Use `mythic-plus/affixes` endpoint.

## Presenting Results

- Show M+ score with its color (use score-tier mapping)
- Format run times as `Xm Xs` with +/- time relative to par
- Show key level upgrades (e.g., "+2 timed" or "+1 depleted")
- For score gaps, show a table: dungeon | current best | suggested key | potential score gain
- Use the WoW parse color system for rank context where applicable

## Error Handling

- Character not found: "Character not found on Raider.IO. Check the name, realm, and region."
- No M+ data: "This character has no Mythic+ runs logged for the current season."
- API error: Report the HTTP status and suggest trying again.
```

- [ ] **Step 2: Write CLAUDE.md**

```markdown
# Raider.IO

Raider.IO API skill for querying Mythic+ data.

## Skill

The main skill is defined in `SKILL.md`. When answering M+ questions:

1. Read `SKILL.md` for instructions and decision logic
2. Use endpoint docs from `references/endpoints.md`
3. Consult `references/schema.md` for response shapes
4. Execute queries via `./scripts/rio.sh <endpoint> [params...]`

## No Credentials Required

The Raider.IO API is free and public. No `.env` file or API key needed.

## Current Content (Midnight Expansion)

- Current M+ season: Midnight Season 1 (slug: season-mn-1)
- Expansion ID: 11
- Raid tier: tier-mn-1
```

- [ ] **Step 3: Test the skill trigger**

Verify the skill description in the SKILL.md frontmatter would trigger correctly. The description should match on: "M+ score", "raider.io", "rio", "what keys do I need", "mythic plus", "dungeon ranking", "run history".

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/raiderio/SKILL.md .claude/skills/raiderio/CLAUDE.md
git commit -m "feat: add /raiderio skill definition and context"
```

---

## Task 4: `/archon` Skill — References (Research Phase)

**Files:**
- Create: `.claude/skills/archon/references/urls.md`
- Create: `.claude/skills/archon/references/parsing.md`

This task requires research to verify URL patterns and data extraction from Archon.gg pages.

- [ ] **Step 1: Write urls.md**

Document URL patterns discovered during research:

```markdown
# Archon.gg URL Patterns

Base URL: `https://www.archon.gg/wow`

## Tier Lists

Pattern: `/tier-list/{role}-rankings/{content-type}/{difficulty}/{encounter}[/{affix}]`

### Roles
- `dps-rankings`
- `healer-rankings`
- `tank-rankings`

### Raid Tier Lists
- `/tier-list/dps-rankings/raid/heroic/all-bosses`
- `/tier-list/dps-rankings/raid/mythic/all-bosses`
- `/tier-list/dps-rankings/raid/heroic/{boss-slug}` (per-boss)

Boss slugs (current tier): `imperator`, `vorasius`, `salhadaar`, `vaelgor`, `vanguard`, `crown`, `chimaerus`, `beloren`, `midnight-falls`

### M+ Tier Lists
- `/tier-list/dps-rankings/mythic-plus/10/all-dungeons/this-week`
- `/tier-list/dps-rankings/mythic-plus/10/{dungeon-slug}/this-week`

Dungeon slugs: [current season dungeon slugs]

## Builds

Pattern: `/builds/{spec}/{class}/{content-type}/{section}/{difficulty}/{encounter}[/{affix}]`

### Sections
- `overview` — stat priority, top build summary
- `talents` — multiple builds with popularity %, import strings
- `gear-and-tier-set` — BiS items by slot
- `enchants-and-gems` — enchant/gem recommendations
- `consumables` — flasks, potions, weapon buffs
- `trinkets` — trinket pair combos and individual rankings
- `rotation` — opener and priority (dynamically loaded)

### Examples
- `/builds/frost/mage/raid/talents/heroic/all-bosses`
- `/builds/frost/mage/mythic-plus/talents/10/all-dungeons/this-week`
- `/builds/holy/paladin/raid/gear-and-tier-set/heroic/all-bosses`

## Class/Spec Slugs

Populate the full slug mapping. Format: `spec-slug/class-slug`. Known examples from research:
`frost/mage`, `fire/mage`, `arcane/mage`, `holy/paladin`, `protection/paladin`, `retribution/paladin`, `beast-mastery/hunter`, `marksmanship/hunter`, `survival/hunter`, `assassination/rogue`, `outlaw/rogue`, `subtlety/rogue`, `shadow/priest`, `discipline/priest`, `holy/priest`, `restoration/druid`, `balance/druid`, `feral/druid`, `guardian/druid`, `elemental/shaman`, `enhancement/shaman`, `restoration/shaman`, `affliction/warlock`, `demonology/warlock`, `destruction/warlock`, `arms/warrior`, `fury/warrior`, `protection/warrior`, `brewmaster/monk`, `windwalker/monk`, `mistweaver/monk`, `havoc/demon-hunter`, `vengeance/demon-hunter`, `blood/death-knight`, `frost/death-knight`, `unholy/death-knight`, `devastation/evoker`, `preservation/evoker`, `augmentation/evoker`

Also note hero-talent spec slugs may appear (e.g., `devourer/demon-hunter`). Verify by fetching a build page.
```

- [ ] **Step 2: Write parsing.md**

```markdown
# Archon.gg Data Extraction

Last verified: 2026-03-23

## Rendering Method

Archon.gg pages are **server-side rendered** — data is present in the initial HTML response. `WebFetch` should return usable content.

## Tier List Pages

Data is embedded in the HTML as structured content. Look for:
- Spec names with tier rankings (S/A/B/C)
- 95th percentile DPS/HPS values
- Popularity percentages
- Parse counts

When fetching a tier list page, extract:
1. Each spec's tier placement
2. The numeric performance value
3. Popularity percentage

## Build Pages

The talents section contains:
- Multiple talent builds with popularity percentages
- Wowhead talent calculator import URLs in the format: `https://www.wowhead.com/talent-calc/blizzard/{encoded-string}`
- Hero talent path choices with usage rates

The gear section contains:
- Items listed by equipment slot
- Popularity percentages per item
- Tier set usage

## Error Detection

If `WebFetch` returns a page with no spec data or tier rankings:
- The page structure may have changed
- Warn the user: "Archon.gg page structure may have changed. Check directly at [URL]"
- Never silently return empty results

## Fallback

If a specific page fails, try the broader page (e.g., `all-bosses` instead of a specific boss slug).
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/archon/references/
git commit -m "feat: add Archon.gg URL patterns and parsing reference docs"
```

---

## Task 5: `/archon` Skill — Skill Definition

**Files:**
- Create: `.claude/skills/archon/SKILL.md`
- Create: `.claude/skills/archon/CLAUDE.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: archon
description: Fetch spec tier lists, meta talent builds, gear recommendations, and stat priorities from Archon.gg. Use when the user asks about spec rankings, tier lists, "what's meta", best builds, best talents for raid or M+, stat priority, BiS gear, recommended enchants/gems/consumables, or trinket rankings. Also use when the user mentions Archon or asks which specs are strong/weak this tier.
---

# Archon Skill

You have access to Archon.gg data via WebFetch, which aggregates the top 50% of logged parses to produce spec tier lists, talent builds, gear recommendations, and more.

## Current Content Defaults

- **Expansion:** Midnight
- **Current Raid:** VS / DR / MQD (use `heroic` or `mythic` difficulty)
- **Current M+ Season:** Midnight Season 1 (key level `10` is default for tier lists)
- **Data window:** Rolling 14-day, updates with tuning passes

When the user doesn't specify difficulty, default to Heroic for raid and key level 10 for M+.

## How It Works

1. Determine what the user wants (tier list, talents, gear, etc.)
2. Construct the URL from `references/urls.md`
3. Fetch the page using WebFetch
4. Extract data following `references/parsing.md`
5. Present results clearly

## Query Types

### Tier list ("what's meta", "best specs for M+")
Fetch: `/wow/tier-list/{role}-rankings/{content}/{difficulty}/{encounter}`
Present: Tier placement (S/A/B/C), performance values, popularity

### Talent build ("what talents for frost mage raid")
Fetch: `/wow/builds/{spec}/{class}/{content}/talents/{difficulty}/{encounter}`
Present: Top 1-2 builds with popularity %, Wowhead import link, hero talent choice

### Gear check ("BiS for holy paladin")
Fetch: `/wow/builds/{spec}/{class}/{content}/gear-and-tier-set/{difficulty}/{encounter}`
Present: Items by slot with popularity, tier set info, embellishments

### Enchants/gems/consumables
Fetch: the respective section URL
Present: Recommendations by slot with popularity %

### Trinket rankings
Fetch: `/wow/builds/{spec}/{class}/{content}/trinkets/{difficulty}/{encounter}`
Present: Top trinket pairs, individual trinket rankings

## Presenting Results

- Show tier placement prominently (S/A/B/C)
- Include popularity % alongside recommendations — helps distinguish "universally best" from "niche pick"
- Include Wowhead talent import links when available
- Note the data window: "Based on top parses from the last 14 days"

## Error Handling

- If WebFetch returns empty or no spec data: "Unable to fetch Archon.gg data. The page may have changed or be temporarily unavailable. Check directly: [URL]"
- If a specific boss/dungeon page fails, try the `all-bosses` or `all-dungeons` fallback
- Never silently return incomplete data — always note what was and wasn't retrieved
```

- [ ] **Step 2: Write CLAUDE.md**

```markdown
# Archon

Archon.gg meta data skill for spec tier lists, talent builds, gear, and stat priorities.

## Skill

The main skill is defined in `SKILL.md`. When answering meta/build questions:

1. Read `SKILL.md` for instructions and decision logic
2. Use URL patterns from `references/urls.md`
3. Follow extraction instructions in `references/parsing.md`
4. Fetch pages using WebFetch tool

## No Credentials Required

Archon.gg data is publicly accessible via web pages.

## Current Content (Midnight Expansion)

- Current raid: VS / DR / MQD (Heroic/Mythic)
- Current M+: Midnight Season 1
- Data: rolling 14-day window from top 50% of parses
```

- [ ] **Step 3: Verify Archon data is fetchable**

Use WebFetch to test a known Archon tier list page:
- URL: `https://www.archon.gg/wow/tier-list/dps-rankings/raid/heroic/all-bosses`
- Expected: page content with spec names, tier placements (S/A/B/C), and performance values
- If the page returns empty or JavaScript-only content, update `parsing.md` to note the limitation

Also test a build page:
- URL: `https://www.archon.gg/wow/builds/frost/mage/raid/talents/heroic/all-bosses`
- Expected: talent build data with popularity percentages and Wowhead import links

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/archon/SKILL.md .claude/skills/archon/CLAUDE.md
git commit -m "feat: add /archon skill definition and context"
```

---

## Task 6: `/murlok` Skill — References (Research Phase)

**Files:**
- Create: `.claude/skills/murlok/references/urls.md`
- Create: `.claude/skills/murlok/references/parsing.md`

**Important context:** Murlok.io uses WASM rendering. Raw HTML from `WebFetch` will contain only a loading skeleton, not data. The skill must account for this limitation.

- [ ] **Step 1: Write urls.md**

```markdown
# Murlok.io URL Patterns

Base URL: `https://murlok.io`

## Spec Build Pages

Pattern: `/{class}/{spec}/{mode}`

### Classes (lowercase, hyphenated)
death-knight, demon-hunter, druid, evoker, hunter, mage, monk, paladin, priest, rogue, shaman, warlock, warrior

### Specs (lowercase, standard spec name)
frost, fire, arcane, holy, protection, retribution, restoration, balance, havoc, vengeance, outlaw, assassination, subtlety, beast-mastery, marksmanship, survival, elemental, enhancement, affliction, demonology, destruction, arms, fury, shadow, discipline, devastation, preservation, augmentation, brewmaster, windwalker, mistweaver, blood, unholy, feral, guardian

### Modes
| Mode | Path | Content |
|------|------|---------|
| Mythic+ | `m+` | PvE M+ builds |
| Solo Shuffle | `solo` | PvP |
| 2v2 Arena | `2v2` | PvP |
| 3v3 Arena | `3v3` | PvP |
| Blitz BGs | `blitz` | PvP |
| Rated BGs | `rbg` | PvP |
| Talents | `talents` | Reference only (no build data) |

**NOTE: There is NO raid mode.** Murlok.io does not cover raid content.

### Examples
- `https://murlok.io/mage/frost/m+`
- `https://murlok.io/paladin/holy/m+`
- `https://murlok.io/warrior/fury/3v3`

## Meta Rankings

Pattern: `/meta/{role}/{mode}`

Roles: `dps`, `healer`, `tank`
Modes: same as above (`m+`, `solo`, `3v3`, etc.)

- `https://murlok.io/meta/dps/m+`
- `https://murlok.io/meta/healer/m+`

## Data Available Per Page

1. Top Players — ranked list with name, realm, race, hero talent, ilvl, rating
2. Stat Priority — secondary stats with percentages and ordering
3. Class Talents — heatmap (frequency 0=most used, 2=rare)
4. Spec Talents — same heatmap format
5. Hero Talents — sub-tabs per hero path
6. Best-in-Slot Gear — items by slot with source and popularity
7. Embellishments — up to 2, with popularity
8. Enchantments — by slot with popularity
9. Gems — by type with popularity
10. Races — racial choices with frequency

## Data Source

- Aggregates from **top 50 players** per spec via Blizzard Battle.net API
- Covers US, EU, KR, TW regions
- **Refreshed every 8 hours**
```

- [ ] **Step 2: Write parsing.md**

```markdown
# Murlok.io Data Extraction

Last verified: 2026-03-23

## WASM Rendering Limitation

Murlok.io uses **WebAssembly (WASM)** to render content client-side. The initial HTML contains only a loading skeleton ("Loading 0%"). This means:

- **`WebFetch` will NOT return usable data** — it gets the empty skeleton, not the rendered content
- A headless browser (Puppeteer, Playwright) would be required for reliable scraping
- No public API or JSON endpoints exist

## Workaround Strategy

Since `WebFetch` cannot extract data from WASM-rendered pages, this skill operates in **guidance mode**:

1. **Construct the correct URL** for the user's spec/mode query
2. **Direct the user to the URL** with context about what data they'll find there
3. **Provide the URL** so they can check it themselves or use a browser tool
4. **Supplement with Archon data** when possible — Archon covers much of the same ground (talents, gear, stat priority) with data that IS fetchable

If a headless browser tool becomes available (e.g., via the agent-browser skill or Puppeteer MCP), the skill should use it to fetch rendered content.

## When Murlok Adds Unique Value Over Archon

- **Top player actual gear** — Murlok shows what the top 50 players literally have equipped, not aggregated parse data
- **Embellishment choices** — specifically what embellishments top players are using
- **Racial distribution** — what races top players choose (min-max context)
- **M+ specific** — Murlok's M+ data is from top players by score, while Archon's is from top parses (different populations)

For these cases, providing the direct URL is still valuable even without scraping.

## Future: Headless Browser Integration

If a browser automation tool becomes available, fetch pages like this:
1. Navigate to the spec/mode URL
2. Wait for WASM rendering to complete (look for stat priority or talent data in the DOM)
3. Extract: stat priority, talent heatmap, gear list, enchants, gems
4. The data is structured in the rendered DOM — look for tables and lists within the main content area
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/murlok/references/
git commit -m "feat: add Murlok.io URL patterns and parsing docs (notes WASM limitation)"
```

---

## Task 7: `/murlok` Skill — Skill Definition

**Files:**
- Create: `.claude/skills/murlok/SKILL.md`
- Create: `.claude/skills/murlok/CLAUDE.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: murlok
description: Look up what top-ranked players are actually running from Murlok.io — talents, gear, enchants, gems, embellishments, and stat priorities by spec. Use when the user asks "what are top players running", "what do the best players use", "murlok", "top player builds", or wants to see real equipped gear from top-performing players rather than aggregated parse data. Covers M+ and PvP content (no raid data). Note: Murlok.io uses WASM rendering, so direct data extraction may be limited — this skill provides URLs and supplements with Archon data when possible.
---

# Murlok Skill

Look up what the top 50 players of each spec are actually running, sourced from Blizzard's Battle.net API via Murlok.io.

## Current Content Defaults

- **Expansion:** Midnight
- **M+ Season:** Midnight Season 1
- **Default mode:** `m+` (Mythic+ builds)

When the user doesn't specify a mode, default to M+. Note: **Murlok.io does not have raid data** — for raid builds, use the `/archon` skill instead.

## How It Works

1. Determine the user's spec and desired content mode
2. Construct the URL from `references/urls.md`
3. Attempt to fetch via WebFetch
4. If WebFetch returns data (headless browser available): extract per `references/parsing.md`
5. If WebFetch returns empty skeleton (WASM limitation): provide the direct URL to the user and supplement with `/archon` data for the same spec

## WASM Limitation

Murlok.io renders content via WebAssembly. `WebFetch` typically returns an empty loading skeleton. When this happens:

1. **Provide the direct URL** — e.g., "Check the top frost mage M+ builds at https://murlok.io/mage/frost/m+"
2. **Supplement with Archon** — fetch the equivalent Archon build page, which IS scrapeable, for talent/gear data
3. **Note the distinction** — "Archon aggregates from top parses; Murlok shows what the literal top 50 players have equipped"

## Data Available (When Accessible)

- Talent builds with popularity heatmaps
- Gear choices by slot with source info
- Enchants and gems by slot
- Embellishments (up to 2)
- Stat priority with percentages
- Top player list with ratings
- Racial distribution

## Presenting Results

- Always provide the Murlok.io URL for the user to check
- If data was fetched: present talent builds, gear, enchants/gems, stat priority
- If data was not fetched: present the URL and supplement with Archon data
- Note the data source: "Based on the top 50 players, refreshed every 8 hours"

## Error Handling

- WASM rendering (expected): Follow the workaround strategy above
- Spec not found: Check the spec slug mapping in `references/urls.md`
- No raid mode: "Murlok.io doesn't cover raid content. Checking Archon.gg instead..."
```

- [ ] **Step 2: Write CLAUDE.md**

```markdown
# Murlok

Murlok.io skill for looking up what top-ranked players are actually running.

## Skill

The main skill is defined in `SKILL.md`. When answering "what are top players using" questions:

1. Read `SKILL.md` for instructions and decision logic
2. Use URL patterns from `references/urls.md`
3. Follow extraction/fallback instructions in `references/parsing.md`
4. Fetch pages using WebFetch tool (may hit WASM limitation)

## No Credentials Required

Murlok.io data is publicly accessible. No API key needed.

## Limitations

- **WASM rendering** means WebFetch may return empty content
- **No raid data** — M+ and PvP only
- Falls back to providing URLs + supplementing with Archon data

## Current Content (Midnight Expansion)

- Current M+: Midnight Season 1
- Data: top 50 players per spec, refreshed every 8 hours
```

- [ ] **Step 3: Verify Murlok WASM limitation**

Use WebFetch to test a known Murlok page:
- URL: `https://murlok.io/mage/frost/m+`
- Expected: loading skeleton only (e.g., "Loading 0%") — confirms WASM limitation documented in parsing.md
- If data IS returned (meaning WASM rendering is handled by WebFetch), update `parsing.md` to remove the WASM limitation section and add proper extraction instructions instead

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/murlok/SKILL.md .claude/skills/murlok/CLAUDE.md
git commit -m "feat: add /murlok skill definition and context"
```

---

## Task 8: `/sim` Skill — Research SimHammer API

**Files:**
- Create: `.claude/skills/sim/references/simhammer-api.md`

This is a research task. The SimHammer API shape must be determined from the sortbek/simcraft source code.

**Decision point:** If SimHammer turns out not to have a REST API (e.g., WebSocket only, or the project is abandoned/non-functional), document the findings and skip to Task 10 with the `/sim` skill operating in Raidbots-read-only mode. Update SKILL.md to reflect SimHammer is unavailable.

- [ ] **Step 1: Clone and inspect sortbek/simcraft**

```bash
cd /tmp && git clone --depth 1 https://github.com/sortbek/simcraft.git simcraft-research
```

Inspect the API code:
- Look for route definitions in the Rust backend (likely in `src/` or `api/`)
- Identify endpoints, request/response formats
- Check how SimC profiles are submitted
- Check how results are returned

- [ ] **Step 2: Write simhammer-api.md**

Document the discovered API endpoints, input formats, and response shapes. Include:
- Base URL (default `http://localhost:8000`)
- Available endpoints (Quick Sim, Top Gear, Stat Weights, etc.)
- Request format (POST body with SimC profile string or armory reference)
- Response format (JSON with DPS results, stat weights, etc.)
- Polling mechanism if async

If the API is not documented enough from source inspection, note what's unknown and mark those sections as needing runtime testing after Docker setup.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sim/references/simhammer-api.md
git commit -m "feat: add SimHammer API reference (from source inspection)"
```

---

## Task 9: `/sim` Skill — Scripts and References

**Prerequisite: Task 8 must be completed first.** The sim.sh script depends on SimHammer API endpoints discovered in Task 8.

**Files:**
- Create: `.claude/skills/sim/scripts/sim.sh`
- Create: `.claude/skills/sim/scripts/raidbots.sh`
- Create: `.claude/skills/sim/references/raidbots-data.md`
- Create: `.claude/skills/sim/references/simc-input.md`
- Create: `.claude/skills/sim/.env.example`
- Create: `.claude/skills/sim/.gitignore`

- [ ] **Step 1: Write sim.sh**

SimHammer API wrapper script. Structure depends on Task 8 research, but skeleton:

```bash
#!/usr/bin/env bash
# sim.sh — SimHammer (sortbek/simcraft) API wrapper
# Usage: ./sim.sh <command> [options]
# Commands: quick-sim, top-gear, stat-weights, status
#
# Requires SimHammer Docker running (default: http://localhost:8000)

set -euo pipefail

# Load config
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  while IFS='=' read -r key val; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    val="${val%\"}" && val="${val#\"}"
    export "$key=$val"
  done < "$SCRIPT_DIR/.env"
fi

SIMHAMMER_URL="${SIMHAMMER_URL:-http://localhost:8000}"

# Health check
check_simhammer() {
  if ! curl -s -o /dev/null -w "%{http_code}" "$SIMHAMMER_URL" | grep -q "200\|302"; then
    echo "Error: SimHammer not reachable at $SIMHAMMER_URL" >&2
    echo "Start it with: cd /path/to/simcraft && docker compose up --build" >&2
    exit 1
  fi
}

# --- Polling loop template ---
# Replace SUBMIT_ENDPOINT and STATUS_ENDPOINT with actual values from Task 8
POLL_INTERVAL=5
MAX_TIMEOUT=300  # 5 minutes

poll_for_result() {
  local job_id="$1"
  local elapsed=0
  while (( elapsed < MAX_TIMEOUT )); do
    local status
    status=$(curl -s "${SIMHAMMER_URL}/STATUS_ENDPOINT/${job_id}")
    local state
    state=$(echo "$status" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state','unknown'))" 2>/dev/null || echo "unknown")
    case "$state" in
      complete|finished)
        echo "$status"
        return 0
        ;;
      error|failed)
        echo "Error: Simulation failed" >&2
        echo "$status" >&2
        return 1
        ;;
      *)
        sleep $POLL_INTERVAL
        elapsed=$((elapsed + POLL_INTERVAL))
        ;;
    esac
  done
  echo "Error: Simulation timed out after ${MAX_TIMEOUT}s. Check SimHammer at $SIMHAMMER_URL" >&2
  return 1
}

# [Exact endpoints and request format from Task 8 research]
# Submit: curl -X POST ${SIMHAMMER_URL}/SUBMIT_ENDPOINT -d '{"profile": "..."}'
# Status: curl ${SIMHAMMER_URL}/STATUS_ENDPOINT/{job_id}
# Result: curl ${SIMHAMMER_URL}/RESULT_ENDPOINT/{job_id}
```

Exact endpoint paths and request/response formats depend on SimHammer API discovered in Task 8. Replace all `SUBMIT_ENDPOINT`, `STATUS_ENDPOINT`, `RESULT_ENDPOINT` placeholders.

- [ ] **Step 2: Write raidbots.sh**

```bash
#!/usr/bin/env bash
# raidbots.sh — Raidbots public data fetcher
# Usage: ./raidbots.sh report <report-id>     — fetch sim report results
#        ./raidbots.sh static <data-key>       — fetch static game data
#
# No auth required. Public read-only endpoints.

set -euo pipefail

RAIDBOTS_URL="https://www.raidbots.com"
RAIDBOTS_STATIC="https://www.raidbots.com/static/data"

if [[ $# -lt 2 ]]; then
  echo "Usage: raidbots.sh <command> <arg>" >&2
  echo "Commands:" >&2
  echo "  report <report-id>  — fetch sim report results" >&2
  echo "  static <data-key>   — fetch static game data" >&2
  echo "Static keys: instances, talents, bonuses, crafting, enchantments," >&2
  echo "  equippableItems, itemConversions, itemCurves, itemLimitCategories," >&2
  echo "  itemNames, itemSets" >&2
  exit 1
fi

command="$1"
arg="$2"

case "$command" in
  report)
    url="${RAIDBOTS_URL}/reports/${arg}/data.json"
    ;;
  static)
    url="${RAIDBOTS_STATIC}/live/${arg}.json"
    ;;
  *)
    echo "Unknown command: $command" >&2
    exit 1
    ;;
esac

response=$(curl -s -w "\n%{http_code}" "$url")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" -ge 400 ]]; then
  echo "Error: Raidbots returned HTTP $http_code" >&2
  echo "$body" >&2
  exit 1
fi

echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
```

- [ ] **Step 3: Make scripts executable**

```bash
chmod +x .claude/skills/sim/scripts/sim.sh .claude/skills/sim/scripts/raidbots.sh
```

- [ ] **Step 4: Write raidbots-data.md**

```markdown
# Raidbots Public Endpoints

No auth required. Read-only access.

## Sim Report Results

`GET https://www.raidbots.com/reports/{reportId}/data.json`

Returns the full JSON results of a completed simulation. The report ID comes from a Raidbots URL like `https://www.raidbots.com/simbot/report/{reportId}`.

Usage: `raidbots.sh report <report-id>`

## Static Game Data

`GET https://www.raidbots.com/static/data/live/{key}.json`

Available keys:
| Key | Description |
|-----|-------------|
| `instances` | Raid/dungeon instance data |
| `talents` | Talent tree data |
| `bonuses` | Item bonus IDs |
| `crafting` | Crafting recipes |
| `enchantments` | Enchantment data |
| `equippableItems` | Full equippable item database |
| `itemConversions` | Item conversion/upgrade paths |
| `itemCurves` | Item level scaling curves |
| `itemLimitCategories` | Item limit categories (e.g., embellishment limits) |
| `itemNames` | Item ID → name mapping |
| `itemSets` | Tier set definitions |

Usage: `raidbots.sh static <key>`

## Notes

- These endpoints are publicly accessible but not officially documented
- If they become restricted, fall back to SimHammer-only mode
- Report data includes: DPS values, stat weights, gear comparisons, talent comparisons (depends on sim type)
```

- [ ] **Step 5: Write simc-input.md**

```markdown
# SimulationCraft Profile Input

## Getting a SimC Profile

### Method 1: SimC Addon (Recommended)
1. Install the SimulationCraft addon in WoW
2. Type `/simc` in-game
3. Copy the text from the addon window
4. Paste as input to sim.sh

### Method 2: Armory Import
SimHammer can import directly from the WoW Armory given character name, realm, and region.

## SimC Profile Format

A SimC profile is plain text describing a character:

```
priest="Healbot"
level=80
race=void_elf
region=us
server=illidan
role=spell
professions=alchemy=100/enchanting=100
spec=shadow
talents=...

head=,id=XXXXX,bonus_id=...
neck=,id=XXXXX,bonus_id=...
[etc for each slot]
```

## Sim Types

| Type | Purpose | When to Use |
|------|---------|-------------|
| Quick Sim | Single DPS number for current setup | "How much DPS do I do?" |
| Top Gear | Best combination from available items | "What's my best gear combo?" |
| Stat Weights | Value of each secondary stat | "What stats should I prioritize?" |
| Gear Compare | Compare specific items head-to-head | "Is this trinket an upgrade?" |
```

- [ ] **Step 6: Write .env.example and .gitignore**

`.env.example` (committed — shows expected vars):
```
# Copy to .env and customize
SIMHAMMER_URL=http://localhost:8000
```

`.gitignore` (committed — prevents .env from being tracked):
```
.env
```

Note: Do NOT create or commit `.env` itself — only `.env.example`. Users copy it to `.env` during setup.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/sim/scripts/ .claude/skills/sim/references/ .claude/skills/sim/.env.example .claude/skills/sim/.gitignore
git commit -m "feat: add sim scripts and reference docs"
```

---

## Task 10: `/sim` Skill — Skill Definition

**Files:**
- Create: `.claude/skills/sim/SKILL.md`
- Create: `.claude/skills/sim/CLAUDE.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: sim
description: Run SimulationCraft simulations and fetch Raidbots data for gear comparison, stat weights, top gear optimization, and talent comparison. Use when the user asks "is this an upgrade", "sim my character", "stat weights", "what stats should I prioritize", "best gear", "top gear", "compare these items", "vault recommendation", or mentions SimC, SimulationCraft, Raidbots, or simming. Also use when the user pastes a SimC addon string or a Raidbots report URL.
---

# Sim Skill

Run SimulationCraft simulations locally via SimHammer and fetch existing sim results from Raidbots.

## Setup Requirements

### SimHammer (Primary — Local Sims)
- Docker must be installed and running
- Clone and start: `git clone https://github.com/sortbek/simcraft.git && cd simcraft && docker compose up --build`
- API available at `http://localhost:8000` (configurable via `.env`)

### Raidbots (Secondary — Read-Only)
- No setup required — public endpoints, no auth

## How It Works

### For new simulations (SimHammer)
1. Get the character's SimC profile (from addon paste or armory import)
2. Determine sim type (Quick Sim, Top Gear, Stat Weights, Gear Compare)
3. Submit via `<skill-path>/scripts/sim.sh`
4. Poll for results (5s interval, 5min timeout)
5. Present results

### For existing Raidbots reports
1. Extract report ID from URL (e.g., `https://www.raidbots.com/simbot/report/ABC123` → `ABC123`)
2. Fetch via `<skill-path>/scripts/raidbots.sh report <id>`
3. Present results

### For game data lookups
Use `<skill-path>/scripts/raidbots.sh static <key>` for item/talent/enchant data.

## Getting Character Input

Ask the user for one of:
1. **SimC addon string** — paste from `/simc` in-game (most accurate)
2. **Character name + realm + region** — for armory import (may lag behind actual gear)
3. **Raidbots report URL** — for fetching existing sim results

See `references/simc-input.md` for format details.

## Sim Types

| Question | Sim Type | What It Does |
|----------|----------|-------------|
| "How much DPS do I do?" | Quick Sim | Single DPS number for current setup |
| "Is this trinket an upgrade?" | Gear Compare | Compare two items side-by-side |
| "What's my best gear combo?" | Top Gear | Try all combinations of available items |
| "What stats should I prioritize?" | Stat Weights | Value of each secondary stat point |

## Presenting Results

- DPS values: format as `X.XXk` or `X.XXM`
- Stat weights: show as a ranked list with relative values (e.g., "Haste: 1.00, Mastery: 0.87, Crit: 0.82, Vers: 0.79")
- Gear compare: show DPS difference and percentage gain
- Top gear: show the optimal combination and DPS gain over current

## Error Handling

- **SimHammer not running:** "SimHammer is not reachable at [URL]. Start it with: `cd /path/to/simcraft && docker compose up --build`"
- **Sim timeout (>5min):** "Simulation is taking longer than expected. Check SimHammer directly at [URL]"
- **No SimC profile:** "I need your character's SimC profile. Type `/simc` in-game and paste the output, or give me your character name, realm, and region."
- **Raidbots report not found:** "Report not found. The URL may be incorrect or the report may have expired."
- **Raidbots endpoints restricted:** "Raidbots data endpoints appear to be restricted. Using SimHammer for all sim needs."

## Reference Files

- `references/simhammer-api.md` — SimHammer REST API endpoints
- `references/raidbots-data.md` — Raidbots public endpoints
- `references/simc-input.md` — SimC profile format and how to get one
```

- [ ] **Step 2: Write CLAUDE.md**

```markdown
# Sim

SimulationCraft skill for gear optimization and character simulation.

## Skill

The main skill is defined in `SKILL.md`. When answering sim/gear questions:

1. Read `SKILL.md` for instructions and decision logic
2. Use `./scripts/sim.sh` for SimHammer sims
3. Use `./scripts/raidbots.sh` for Raidbots data
4. Consult references for API shapes and input formats

## Credentials

`SIMHAMMER_URL` in `.env` (defaults to `http://localhost:8000`). No Raidbots credentials needed.

## Setup

SimHammer requires Docker: `git clone https://github.com/sortbek/simcraft.git && cd simcraft && docker compose up --build`

## Current Content (Midnight Expansion)

- Game data from Raidbots CDN reflects the current live patch
- SimC profiles from the addon reflect the character's current gear
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/sim/SKILL.md .claude/skills/sim/CLAUDE.md
git commit -m "feat: add /sim skill definition and context"
```

---

## Task 11: `/wow-check` Hub Skill — References

**Files:**
- Create: `.claude/skills/wow-check/references/routing.md`
- Create: `.claude/skills/wow-check/references/audit-template.md`

- [ ] **Step 1: Write routing.md**

```markdown
# Intent → Spoke Routing

## Classification Rules

When the user asks a WoW question via /wow-check, classify it into one of these categories and route to the appropriate spoke(s).

### Single-Spoke Routes

| Intent Category | Keywords/Patterns | Spoke |
|---|---|---|
| M+ score/profile | "m+ score", "rio score", "raider.io", "what keys", "key level", "push", "run history" | `/raiderio` |
| Spec tier list | "tier list", "what's meta", "best spec", "strongest", "S tier", "rankings" | `/archon` |
| Top player builds | "what are top players running", "what do the best use", "top 50", "murlok" | `/murlok` |
| Sim/gear | "sim", "upgrade", "stat weights", "best gear", "trinket", "top gear", "vault" | `/sim` |
| Raid parses | "parses", "logs", "percentile", "wcl", "warcraftlogs" | `/warcraftlogs` |

### Multi-Spoke Routes

| Intent Category | Keywords/Patterns | Spokes |
|---|---|---|
| Build recommendation | "what build", "what talents", "best build for [boss]" | `/archon` + `/murlok` |
| Comp advice | "best comp", "what comp for", "group comp" | `/archon` + `/raiderio` |
| Raid readiness | "raid ready", "ready for mythic", "ready to raid" | `/raiderio` + `/sim` + `/warcraftlogs` |
| Full audit | "audit", "check me", "full check", character+realm with no specific question | All spokes |

### Fallback

If the intent is ambiguous:
1. Make a best guess based on context
2. State your interpretation: "I'm reading this as a build question — checking Archon and Murlok"
3. The user can redirect if wrong

## Character Resolution

For routes that need a character:
1. Ask for name + realm + region if not provided
2. Query Raider.IO first (fast, free) to get: spec, class, score, gear
3. Use the detected spec to query Archon and Murlok
4. Use character identity for WarcraftLogs and SimHammer

## Spoke Invocation

Each spoke is a sibling Claude Code skill. To invoke a spoke:
- Reference its SKILL.md for instructions
- Use its scripts (rio.sh, wcl.sh, sim.sh, raidbots.sh) for data fetching
- Use WebFetch for Archon/Murlok pages
- Follow each spoke's error handling
```

- [ ] **Step 2: Write audit-template.md**

```markdown
# Full Character Audit Template

## Output Format

```
== CHARACTER AUDIT: [Name] - [Realm] ([Region]) ==
[Class] — [Spec] | [Item Level] | [Guild or "No guild"]

--- M+ STANDING (Raider.IO) ---
Score: [score] ([color name]) | [Role] Rank: [realm] realm / [region] region
Best runs:
  [Dungeon Short] +[level] [timed/depleted] ([time] / [par]) — [score]
  [...]
Score gaps (biggest improvement opportunities):
  [Dungeon] — current best: +[level] ([score]), push to +[target] for +[gain] score
  [...]
Missing dungeons: [list any dungeons with no runs]

--- BUILD CHECK (Archon + Murlok) ---
Spec tier: [S/A/B/C] for [content type] (Archon)
Meta build match: [X/Y talents match] | [differences noted]
Talent divergences:
  [talent name] — you: [choice], meta: [choice] ([popularity]%)
Enchants/Gems:
  [slot]: [current] → recommended: [meta choice] ([popularity]%)
  [only list mismatches]

--- GEAR OPTIMIZATION (SimCraft) ---
[If SimHammer available:]
Stat weights: [Stat]: [weight], [Stat]: [weight], ...
Top upgrade slots: [slot] ([current ilvl] → [target])
Vault recommendation: [which row/slot offers best expected gain]

[If SimHammer not available:]
Sim section skipped — SimHammer not running at [URL]
Start with: cd /path/to/simcraft && docker compose up --build

--- RECENT PERFORMANCE (WarcraftLogs) ---
Latest raid: [raid name] ([difficulty]) — [X/Y bosses, date]
Median parse: [percentile]% ([color])
Best parse: [boss] [percentile]% ([color])
Worst parse: [boss] [percentile]% ([color])
Trend: [improving/declining/stable] over last [N] logs

---
Want to dig deeper?
- "Show my M+ gaps" — detailed score optimization
- "Show my build vs meta" — full talent/gear comparison
- "Sim my character" — run a fresh simulation (requires SimC addon string)
- "Review my last raid" — use /raid-review for mechanic analysis
```

## Section Ordering

Always present in this order:
1. M+ Standing (fast, sets context)
2. Build Check (uses spec from step 1)
3. Gear Optimization (may be skipped if SimHammer unavailable)
4. Recent Performance (WarcraftLogs, may be slow due to API)

## Graceful Degradation

If a spoke fails, skip its section with a note:
- "M+ section skipped — character not found on Raider.IO"
- "Build check skipped — unable to fetch Archon data"
- "Sim section skipped — SimHammer not running"
- "Performance section skipped — no WarcraftLogs data found"

Never fail the entire audit due to one spoke failure.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/wow-check/references/
git commit -m "feat: add wow-check routing rules and audit template"
```

---

## Task 12: `/wow-check` Hub Skill — Skill Definition

**Files:**
- Create: `.claude/skills/wow-check/SKILL.md`
- Create: `.claude/skills/wow-check/CLAUDE.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: wow-check
description: Smart router for all WoW questions — routes to the right data source automatically. Use for any general WoW question that could involve multiple data sources, for full character audits, or when the user says "check me", "audit my character", "wow check", or asks a broad WoW question without specifying a data source. Also catches questions that could go to raiderio, archon, murlok, sim, or warcraftlogs when the user doesn't invoke a specific skill. Think of this as the "I have a WoW question" catch-all.
---

# WoW Check — Smart Router & Character Audit

Routes WoW questions to the right data source(s) and synthesizes unified answers. Also performs full character audits combining all available data.

## Dependencies

This skill orchestrates sibling skills:
- `${CLAUDE_SKILL_DIR}/../raiderio/` — M+ data (Raider.IO API)
- `${CLAUDE_SKILL_DIR}/../archon/` — Meta data (Archon.gg)
- `${CLAUDE_SKILL_DIR}/../murlok/` — Top player data (Murlok.io)
- `${CLAUDE_SKILL_DIR}/../sim/` — Simulation data (SimHammer + Raidbots)
- `${CLAUDE_SKILL_DIR}/../warcraftlogs/` — Raid/M+ logs (WarcraftLogs API)

Read each spoke's SKILL.md for its instructions and capabilities.

## How It Works

1. Classify the user's intent using `references/routing.md`
2. Announce which spokes you're using: "Checking Raider.IO for your M+ data and Archon for current meta..."
3. Invoke the appropriate spoke(s) following their SKILL.md instructions
4. Synthesize results into a unified answer

## Full Character Audit

When the user provides a character name + realm (or says "check me", "audit"):

1. **Raider.IO first** — fast, gives spec/class/score/gear context
2. **Archon + Murlok** — using detected spec for build comparison
3. **SimHammer** — if available, run stat weights or note it's not running
4. **WarcraftLogs** — recent raid parses and performance trend

Follow the output format in `references/audit-template.md`.

## Routing

See `references/routing.md` for the full intent → spoke mapping. Key principles:
- Single-spoke for focused questions (just M+ score → raiderio only)
- Multi-spoke for complex questions (build recommendation → archon + murlok)
- All spokes for audits
- State your interpretation for ambiguous queries

## Hub vs Direct Invocation

Users can always invoke spokes directly (`/raiderio`, `/archon`, etc.) for targeted queries. This hub adds value when:
- The question spans multiple data sources
- The user wants a comprehensive audit
- The user isn't sure which skill to use

## Error Handling

- **Spoke failure:** Skip that section, note what's missing, continue with available data
- **Character not found:** If Raider.IO can't find the character, ask user to verify name/realm/region
- **All spokes fail:** "Unable to fetch data from any source. Check your internet connection and try again."
- **Ambiguous query:** Make a best guess, state interpretation, let user redirect

## Reference Files

- `references/routing.md` — Intent classification and spoke mapping
- `references/audit-template.md` — Full audit output format
```

- [ ] **Step 2: Write CLAUDE.md**

```markdown
# WoW Check

Hub/router skill that orchestrates all WoW data-source skills.

## Skill

The main skill is defined in `SKILL.md`. This is the catch-all WoW skill that:

1. Classifies user intent
2. Routes to the right spoke(s): raiderio, archon, murlok, sim, warcraftlogs
3. Synthesizes unified answers

## Dependencies

All sibling skills:
- `raiderio` — M+ scores, runs, rankings (Raider.IO API)
- `archon` — Tier lists, meta builds, gear (Archon.gg)
- `murlok` — Top player builds (Murlok.io, WASM-limited)
- `sim` — SimulationCraft sims (SimHammer Docker + Raidbots)
- `warcraftlogs` — Raid/M+ combat logs (WarcraftLogs API)

## Current Content (Midnight Expansion)

Defers to each spoke for current content defaults:
- Raid: VS / DR / MQD (zone 46)
- M+ Season: Midnight Season 1 (zone 47)
- Expansion: Midnight (ID 7)
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/wow-check/SKILL.md .claude/skills/wow-check/CLAUDE.md
git commit -m "feat: add /wow-check hub skill definition and context"
```

---

## Task 13: Update Project Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Add the new skills to the skill list and update the project structure tree:

```markdown
## Skills

- **`/warcraftlogs`** — Query the WarcraftLogs v2 GraphQL API for raid/M+ data.
- **`/raid-review`** — Analyze a raid log and produce mechanic-focused improvement feedback with video/guide resources.
- **`/raiderio`** — Query the Raider.IO API for M+ scores, run history, rankings, and character profiles.
- **`/archon`** — Fetch spec tier lists, meta builds, gear, and stat priorities from Archon.gg.
- **`/murlok`** — Look up what top players are actually running from Murlok.io (M+ and PvP).
- **`/sim`** — Run SimulationCraft simulations via SimHammer and fetch Raidbots data.
- **`/wow-check`** — Smart router that answers any WoW question by routing to the right skill(s). Full character audits.
```

Update the project structure tree to include all new skill directories.

- [ ] **Step 2: Update README.md**

Add setup instructions for new skills:
- raiderio: no setup needed
- archon: no setup needed
- murlok: no setup needed (note WASM limitation)
- sim: Docker + SimHammer setup instructions
- wow-check: no setup, uses other skills

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update project docs with all 7 skills and setup instructions"
```

---

## Task 14: End-to-End Verification

- [ ] **Step 1: Test each skill triggers correctly**

Verify the SKILL.md frontmatter descriptions would trigger for their intended queries. Review each skill's `name` and `description` fields.

- [ ] **Step 2: Test raiderio script**

```bash
# Character profile
.claude/skills/raiderio/scripts/rio.sh characters/profile region=us realm=illidan name=Dsjr fields=mythic_plus_scores_by_season:current

# Current affixes
.claude/skills/raiderio/scripts/rio.sh mythic-plus/affixes region=us

# Static data
.claude/skills/raiderio/scripts/rio.sh mythic-plus/static-data expansion_id=11
```

- [ ] **Step 3: Test raidbots script**

```bash
# Static game data
.claude/skills/sim/scripts/raidbots.sh static itemNames

# If you have a report ID:
# .claude/skills/sim/scripts/raidbots.sh report <id>
```

- [ ] **Step 4: Test archon via WebFetch**

Fetch an Archon tier list page and verify data is extractable:
- `https://www.archon.gg/wow/tier-list/dps-rankings/raid/heroic/all-bosses`

- [ ] **Step 5: Verify murlok WASM limitation**

Fetch a Murlok page and confirm the WASM limitation:
- `https://murlok.io/mage/frost/m+`

Expected: loading skeleton only, confirming the documented limitation.

- [ ] **Step 6: Test wow-check hub routing**

Manually verify the hub would route correctly by walking through these queries against `references/routing.md`:
- "How's my M+ score?" → should route to `/raiderio` only
- "What's the best spec for M+?" → should route to `/archon` only
- "What build should I run for Midnight Falls?" → should route to `/archon` + `/murlok`
- "Audit Toon on Illidan US" → should route to all spokes

If invoking `/wow-check` directly, verify it announces the spokes it's using and produces output in the audit template format.

- [ ] **Step 7: Commit any fixes**

If any tests reveal issues, fix and commit specific files:

```bash
git add <specific files that changed>
git commit -m "fix: address issues found during end-to-end verification"
```
