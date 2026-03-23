# Murlok.io Parsing Guide

## WASM Rendering Limitation

**Last verified: 2026-03-23**

Murlok.io uses WebAssembly (WASM) rendering for spec build pages. The initial HTML contains only a loading skeleton — no actual data.

### What WebFetch Returns for Spec Pages

Fetching a spec build page like `https://murlok.io/mage/frost/m+` returns:

- Site header and navigation (fully rendered)
- Section headings/outline (Top Players, Stat Priority, Talents, BiS Gear, etc.)
- A "Loading 0%" indicator with a WASM loader
- **No actual data** — no talent builds, no gear lists, no stat priorities, no player names

The page requires a WASM runtime to hydrate content, which WebFetch does not support.

### What WebFetch Returns for Meta Pages

**Meta ranking pages (`/meta/{role}/{mode}`) DO return actual data.** Fetching `https://murlok.io/meta/dps/m+` successfully returns the full ranked list of all specs with their relative positioning. This data is rendered server-side or in static HTML, not behind WASM.

## Workaround Strategy

Since spec build pages cannot be scraped:

### 1. Always Provide the Direct URL

Construct the URL using patterns from `urls.md` and give it to the user so they can view the full interactive page in their browser.

### 2. Fetch Meta Rankings When Relevant

If the user asks about which specs are best, fetch the meta page — this data IS accessible:
- `https://murlok.io/meta/dps/m+`
- `https://murlok.io/meta/healer/m+`
- `https://murlok.io/meta/tank/m+`

### 3. Supplement with Archon Data

For spec-specific build details (talents, gear, stats), supplement with data from Archon which is scrapable:
- Archon covers talent builds, stat priorities, and tier lists
- Use the `/archon` skill if available, or fetch Archon pages directly
- Note the data source difference to the user: Archon aggregates top parses, Murlok tracks top players by score

### 4. Attempt WebFetch Anyway

Always attempt to fetch the spec page first — Murlok may change their rendering approach in the future. If data comes through, use it. If you get a loading skeleton, fall back to the strategy above.

## When Murlok Adds Unique Value Over Archon

Even though spec pages can't be scraped, Murlok offers data that Archon does not:

- **Actual equipped gear** — real items worn by top players, not just what parses well
- **Embellishment choices** — crafted embellishment usage from top players
- **Racial distribution** — which races top players are running
- **M+ player data by score** — ranked by overall M+ score, not by individual dungeon parses
- **PvP builds** — Solo Shuffle, Arena, RBG builds (Archon focuses on PvE)
- **Gem and enchant specifics** — exact choices from top-performing players

For these data points, providing the Murlok URL is the best we can do until direct extraction is possible.

## Future: Headless Browser Integration

If a headless browser tool becomes available (e.g., Playwright MCP, browser automation), Murlok spec pages could be fully scraped by executing the WASM runtime. This would unlock direct extraction of all data listed above.
