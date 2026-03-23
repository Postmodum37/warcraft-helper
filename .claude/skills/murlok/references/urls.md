# Murlok.io URL Patterns

Base URL: `https://murlok.io`

## Spec Build Pages

**Pattern:** `/{class}/{spec}/{mode}`

**Example:** `https://murlok.io/paladin/holy/m+`

### Classes

death-knight, demon-hunter, druid, evoker, hunter, mage, monk, paladin, priest, rogue, shaman, warlock, warrior

### Specs

| Class | Specs |
|-------|-------|
| Death Knight | blood, frost, unholy |
| Demon Hunter | havoc, vengeance |
| Druid | balance, feral, guardian, restoration |
| Evoker | augmentation, devastation, preservation |
| Hunter | beast-mastery, marksmanship, survival |
| Mage | arcane, fire, frost |
| Monk | brewmaster, mistweaver, windwalker |
| Paladin | holy, protection, retribution |
| Priest | discipline, holy, shadow |
| Rogue | assassination, outlaw, subtlety |
| Shaman | elemental, enhancement, restoration |
| Warlock | affliction, demonology, destruction |
| Warrior | arms, fury, protection |

### Modes

| Mode | Description |
|------|-------------|
| `m+` | Mythic+ (top players by M+ score) |
| `solo` | Solo Shuffle |
| `2v2` | 2v2 Arena |
| `3v3` | 3v3 Arena |
| `blitz` | Battleground Blitz |
| `rbg` | Rated Battlegrounds |
| `talents` | Reference only (no gear/stats) |

**IMPORTANT: No raid mode exists.** URLs like `/paladin/holy/raid` return 404. For raid data, use Archon or WarcraftLogs instead.

## Meta Rankings Pages

**Pattern:** `/meta/{role}/{mode}`

**Example:** `https://murlok.io/meta/dps/m+`

### Roles

`dps`, `healer`, `tank`

### Modes

Same as spec build modes: `m+`, `solo`, `2v2`, `3v3`, `blitz`, `rbg`

## Data Available Per Spec Page

Each spec build page contains:

- **Top Players** — top 50 players with names, realms, scores
- **Stat Priority** — stat distribution from top players' gear
- **Class Talents** — heatmap of talent point allocation
- **Spec Talents** — heatmap of spec talent choices
- **Hero Talents** — sub-tabs per hero talent path (e.g., Spellslinger, Frostfire)
- **Best-in-Slot Gear** — actual equipped items from top players
- **Embellishments** — crafted embellishment usage
- **Enchantments** — enchant choices across all slots
- **Gems** — gem choices and distribution
- **Races** — racial distribution among top players

## Data Source

All data comes from the top 50 players per spec via the Blizzard Battle.net API (not parse-based). Data is refreshed every 8 hours. Covers US, EU, KR, and TW regions.
