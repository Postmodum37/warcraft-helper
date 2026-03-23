---
name: archon
description: Fetch spec tier lists, meta talent builds, gear recommendations, and stat priorities from Archon.gg. Use when the user asks about spec rankings, tier lists, "what's meta", best builds, best talents for raid or M+, stat priority, BiS gear, recommended enchants/gems/consumables, or trinket rankings. Also use when the user mentions Archon or asks which specs are strong/weak this tier.
---

# Archon Skill

You have access to Archon.gg, which provides data-driven spec tier lists, meta talent builds, gear recommendations, enchant/gem choices, consumables, and trinket rankings for WoW raid and M+ content. Data is sourced from the top 50% of parses over a rolling 14-day window.

## Current Content Defaults

When the user doesn't specify a raid, dungeon season, or expansion, always default to the current content:

- **Expansion**: Midnight
- **Current Raid**: VS / DR / MQD (difficulties: `heroic` default, also `normal`, `mythic`)
  - Bosses: Imperator Averzian, Vorasius, Fallen-King Salhadaar, Vaelgor & Ezzorak, Lightblinded Vanguard, Crown of the Cosmos, Chimaerus the Undreamt God, Belo'ren Child of Al'ar, Midnight Falls
- **Current M+ Season**: Midnight Season 1 (default key level `10`)
- **Data Window**: Rolling 14 days, top 50% of parses
- **Default Difficulty**: Heroic for raid, key level 10 for M+

## How It Works

1. Determine what the user is asking about (tier list, talents, gear, enchants, consumables, trinkets)
2. Construct the appropriate Archon.gg URL using patterns from `references/urls.md`
3. Fetch the page using the **WebFetch** tool
4. Extract the relevant data from the response
5. Present results clearly to the user

## Query Types

### Tier List

User asks: "what's the best DPS spec?", "healer tier list", "tank rankings for mythic", "which specs are S tier?"

1. Determine role: `dps-rankings`, `healer-rankings`, or `tank-rankings`
2. Determine content: `raid` or `mythic-plus`
3. Determine difficulty/key level and encounter
4. Build URL: `https://www.archon.gg/wow/tier-list/{role}/{content}/{difficulty}/{encounter}`
5. WebFetch the page and extract tier placements, DPS/HPS values, and popularity %

### Talent Build

User asks: "best frost mage talents", "meta build for holy paladin", "what talents for M+?"

1. Identify the spec and class → look up slugs in `references/urls.md`
2. Determine content type (raid or M+) and difficulty
3. Build URL: `https://www.archon.gg/wow/builds/{spec}/{class}/{content}/talents/{difficulty}/{encounter}`
4. WebFetch the page and extract talent builds with popularity %, DPS/HPS values, and Wowhead import links
5. Always include the Wowhead talent import URL so the user can one-click import

### Gear Check

User asks: "BiS gear for fury warrior", "what gear should I wear?", "tier set for resto druid?"

1. Identify spec/class slugs
2. Build URL with `gear-and-tier-set` section
3. WebFetch and extract items by slot with popularity %

### Enchants, Gems, and Consumables

User asks: "what enchants for frost mage?", "best gems?", "what flask should I use?"

1. Identify spec/class slugs
2. Build URL with `enchants-and-gems` or `consumables` section
3. WebFetch and extract recommendations with popularity %

### Trinket Rankings

User asks: "best trinkets for shadow priest?", "trinket tier list?"

1. Identify spec/class slugs
2. Build URL with `trinkets` section
3. WebFetch and extract trinket rankings with popularity %

## Presenting Results

- **Tier lists**: Show tier placement (S/A/B/C) prominently, followed by DPS/HPS value and popularity %
- **Talent builds**: Lead with the most popular build's Wowhead import link, then show alternatives. Always include popularity % so the user knows how dominant a build is
- **Gear/enchants/consumables**: List by slot with the top choice and its popularity %. Mention alternatives if the top choice is below ~60% popularity
- **Trinkets**: Rank by popularity % with slot context
- **Data window note**: Mention that Archon data reflects a rolling 14-day window from top 50% of parses. This context helps the user understand the data isn't all-time or from a single day
- **Wowhead import links**: When showing talent builds, always include the full `https://www.wowhead.com/talent-calc/blizzard/...` URL. This is one of the most useful things to provide

## Error Handling

- **Empty WebFetch result**: Warn the user that the page didn't return data and provide the direct URL so they can check manually
- **Specific encounter page fails**: Fall back to the broader `all-bosses` or `all-dungeons` page, which will always have data
- **Spec slug mismatch**: Double-check against the slug table in `references/urls.md`. Common errors: `beast-mastery` (not `beastmastery`), `demon-hunter` (not `demonhunter`), `death-knight` (not `deathknight`)
- **Stale data**: If the "last updated" timestamp is very old, note this to the user

## Reference Files

- Read `references/urls.md` for URL patterns and class/spec slug lookup
- Read `references/parsing.md` for data extraction guidance and verified page structure
