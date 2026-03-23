# Archon.gg Parsing Guide

Last verified: 2026-03-23

## Rendering Method

Archon.gg is **server-side rendered** — all data is present in the initial HTML response. No JavaScript execution or API calls are needed. WebFetch works reliably.

## Tier List Pages

**URL example:** `https://www.archon.gg/wow/tier-list/dps-rankings/raid/heroic/all-bosses`

**Data available:**
- Spec names grouped by tier (S / A / B / C / D / F)
- DPS/HPS values (95th percentile from top 50% of parses)
- Popularity percentages
- Parse counts
- Additional metrics: throughput, survivability

**Page metadata:**
- Total parse count (e.g., "675,264 parses")
- Data window: "Last 14 days"
- Last updated timestamp (e.g., "2 hours ago")

**Extraction notes:**
- Specs are grouped under tier headings (S, A, B, C, etc.)
- Each spec entry includes the spec name, class, DPS value, and popularity
- The DPS values shown are 95th percentile from the top 50% of parses
- WebFetch returns this data cleanly in markdown format — tiers and values are directly readable

## Build Pages (Talents)

**URL example:** `https://www.archon.gg/wow/builds/frost/mage/raid/talents/heroic/all-bosses`

**Data available:**
- Multiple talent builds ranked by popularity %
- DPS/HPS value for each build
- Hero talent tree choice and individual hero talent selections with usage %
- Full talent list for class and spec trees
- **Wowhead talent import URLs** in the format: `https://www.wowhead.com/talent-calc/blizzard/{encoded-string}`

**Extraction notes:**
- The primary build is shown first with full detail
- Alternative builds follow with their popularity % and DPS values
- Wowhead import links are directly extractable — these let users one-click import into the game
- Hero talent choice (e.g., "Spellslinger 99.9%") is shown with individual talent usage percentages
- Parse count and data currency ("Updated X ago") shown at bottom

## Gear Pages

**URL example:** `https://www.archon.gg/wow/builds/frost/mage/raid/gear-and-tier-set/heroic/all-bosses`

**Data available:**
- Items listed by equipment slot
- Popularity % for each item
- Tier set information

## Enchant/Gem and Consumable Pages

**URL examples:**
- `https://www.archon.gg/wow/builds/frost/mage/raid/enchants-and-gems/heroic/all-bosses`
- `https://www.archon.gg/wow/builds/frost/mage/raid/consumables/heroic/all-bosses`

**Data available:**
- Enchants by slot with popularity %
- Gem choices with popularity %
- Flask, food, potion, augment rune recommendations

## Trinket Pages

**URL example:** `https://www.archon.gg/wow/builds/frost/mage/raid/trinkets/heroic/all-bosses`

**Data available:**
- Trinket rankings with popularity %
- Per-slot trinket usage data

## Error Handling

- **Empty response:** If WebFetch returns no meaningful data, warn the user and provide the direct URL so they can check manually.
- **Specific boss/dungeon fails:** Fall back to the broader `all-bosses` or `all-dungeons` page. Some niche encounters may have insufficient data for per-boss breakdowns.
- **Spec not found:** Double-check the spec/class slug against `urls.md`. Common mistakes: `beast-mastery` not `beastmastery`, `demon-hunter` not `demonhunter`, `death-knight` not `deathknight`.
- **Stale data:** If the "last updated" timestamp is very old, note this to the user — the data may not reflect recent hotfixes or balance changes.
