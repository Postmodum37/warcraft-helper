---
name: murlok
description: Look up what top-ranked players are actually running from Murlok.io — talents, gear, enchants, gems, embellishments, and stat priorities by spec. Use when the user asks "what are top players running", "what do the best players use", "murlok", "top player builds", or wants to see real equipped gear from top-performing players rather than aggregated parse data. Covers M+ and PvP content (no raid data). Note: Murlok.io uses WASM rendering, so direct data extraction may be limited — this skill provides URLs and supplements with Archon data when possible.
---

# Murlok Skill

You can look up what the top-ranked players are actually running for any spec using Murlok.io. This covers real equipped gear, talents, enchants, gems, embellishments, and stat priorities sourced from the top 50 players via the Blizzard Battle.net API.

## Current Content Defaults

When the user doesn't specify, default to:

- **Expansion**: Midnight
- **M+ Season**: Midnight Season 1
- **Default Mode**: `m+` (Mythic+)
- **IMPORTANT: No raid mode exists.** Murlok.io does not have raid data. For raid builds, redirect to Archon or WarcraftLogs.

## How It Works

1. **Determine spec and mode** — figure out the class, spec, and content mode (M+, PvP variant) the user is asking about
2. **Construct the URL** — use patterns from `references/urls.md`
3. **Attempt WebFetch** — try fetching the page to extract data directly
4. **If WASM skeleton (likely):** provide the URL to the user and supplement with Archon data for talent builds and stat priorities
5. **If data loads (meta pages or future changes):** extract and present the data directly

## WASM Limitation

Murlok.io renders spec build pages using WebAssembly. WebFetch returns only a loading skeleton with no actual data for these pages. This is a known limitation.

**However, meta ranking pages (`/meta/{role}/{mode}`) DO return data** and can be scraped successfully. Use these for spec tier list and ranking questions.

### Workaround

When spec build pages return empty content:

1. **Always give the user the direct Murlok URL** so they can view the full interactive page
2. **Fetch the meta page** if the question involves spec rankings — this data is accessible
3. **Supplement with Archon data** for specific build details (talents, stats, gear)
4. **Clearly note data sources** — tell the user what came from where

## Data Available

Each Murlok spec page (viewable in browser) contains:

- **Top Players** — top 50 players with names, realms, scores
- **Stat Priority** — stat distribution from top players' actual gear
- **Class Talents** — heatmap of talent point allocation
- **Spec Talents** — heatmap of spec talent choices
- **Hero Talents** — sub-tabs per hero talent path
- **Best-in-Slot Gear** — actual equipped items from top players
- **Embellishments** — crafted embellishment usage
- **Enchantments** — enchant choices across all slots
- **Gems** — gem choices and distribution
- **Races** — racial distribution among top players

Data is sourced from the top 50 players per spec via Blizzard Battle.net API, refreshed every 8 hours.

## Presenting Results

- **Always provide the Murlok URL** — this is the primary deliverable since the page can't be scraped
- When supplementing with Archon data, clearly label: "From Archon (top parses)" vs "See Murlok for top player gear/enchants/gems"
- Highlight what Murlok uniquely offers: actual equipped gear, embellishments, racial distribution, gem/enchant specifics
- For meta/ranking questions, present the scraped meta page data directly
- Format as a practical "here's what to run" answer, not just links

## Error Handling

- **WASM rendering (spec pages):** Expected behavior. Provide URL + supplement with Archon data.
- **Spec not found:** Check class/spec spelling against the list in `references/urls.md`. Common mistakes: "beastmastery" should be "beast-mastery", "dk" should be "death-knight".
- **User asks for raid builds:** Murlok has no raid mode. Redirect to Archon (`/archon` skill) or WarcraftLogs for raid-specific data. Explain that Murlok tracks M+ and PvP only.
- **Mode not recognized:** Default to `m+` if ambiguous. PvP modes are `solo`, `2v2`, `3v3`, `blitz`, `rbg`.
- **Meta page fetch fails:** Fall back to providing the URL and supplementing with Archon tier list data.

## Reference Files

- `references/urls.md` — URL patterns for spec builds and meta rankings
- `references/parsing.md` — WASM limitation details and workaround strategy
