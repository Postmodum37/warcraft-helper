# Archon.gg URL Patterns

Base URL: `https://www.archon.gg/wow`

## Tier Lists

**Pattern:** `/tier-list/{role}/{content-type}/{difficulty}/{encounter}[/{affix}]`

### Roles

| Role slug | Description |
|---|---|
| `dps-rankings` | DPS tier list |
| `healer-rankings` | Healer tier list |
| `tank-rankings` | Tank tier list |

### Raid Tier Lists

`/tier-list/dps-rankings/raid/heroic/all-bosses`

Difficulties: `normal`, `heroic`, `mythic`

Boss slugs (VS / DR / MQD):
- `all-bosses` — aggregate across all bosses
- `imperator` — Imperator Averzian
- `vorasius` — Vorasius
- `salhadaar` — Fallen-King Salhadaar
- `vaelgor` — Vaelgor & Ezzorak
- `vanguard` — Lightblinded Vanguard
- `crown` — Crown of the Cosmos
- `chimaerus` — Chimaerus the Undreamt God
- `beloren` — Belo'ren Child of Al'ar
- `midnight-falls` — Midnight Falls

### M+ Tier Lists

`/tier-list/dps-rankings/mythic-plus/10/all-dungeons/this-week`

Key level: `10` (default), other integer values possible.

Dungeon slugs: per-dungeon slugs also supported; use `all-dungeons` for aggregate.

Affix: `this-week` for current affix rotation.

## Builds

**Pattern:** `/builds/{spec}/{class}/{content-type}/{section}/{difficulty}/{encounter}[/{affix}]`

### Sections

| Section | What it shows |
|---|---|
| `overview` | Summary of top build |
| `talents` | Talent builds with popularity % and Wowhead import links |
| `gear-and-tier-set` | BiS gear by slot with popularity % |
| `enchants-and-gems` | Enchant and gem recommendations |
| `consumables` | Flasks, food, potions, runes |
| `trinkets` | Trinket rankings with popularity % |
| `rotation` | Rotation priority / ability usage |

### Raid Builds

`/builds/{spec}/{class}/raid/{section}/heroic/all-bosses`

Difficulties: `normal`, `heroic`, `mythic`

Boss encounter slugs: same as tier list (see above).

Example: `/builds/frost/mage/raid/talents/heroic/all-bosses`

### M+ Builds

`/builds/{spec}/{class}/mythic-plus/{section}/10/all-dungeons/this-week`

Example: `/builds/frost/mage/mythic-plus/talents/10/all-dungeons/this-week`

## Class/Spec Slugs

Format in URL: `/builds/{spec-slug}/{class-slug}/...`

| Class | Spec | Spec Slug | Class Slug |
|---|---|---|---|
| Mage | Frost | `frost` | `mage` |
| Mage | Fire | `fire` | `mage` |
| Mage | Arcane | `arcane` | `mage` |
| Paladin | Holy | `holy` | `paladin` |
| Paladin | Protection | `protection` | `paladin` |
| Paladin | Retribution | `retribution` | `paladin` |
| Hunter | Beast Mastery | `beast-mastery` | `hunter` |
| Hunter | Marksmanship | `marksmanship` | `hunter` |
| Hunter | Survival | `survival` | `hunter` |
| Rogue | Assassination | `assassination` | `rogue` |
| Rogue | Outlaw | `outlaw` | `rogue` |
| Rogue | Subtlety | `subtlety` | `rogue` |
| Priest | Shadow | `shadow` | `priest` |
| Priest | Discipline | `discipline` | `priest` |
| Priest | Holy | `holy` | `priest` |
| Druid | Restoration | `restoration` | `druid` |
| Druid | Balance | `balance` | `druid` |
| Druid | Feral | `feral` | `druid` |
| Druid | Guardian | `guardian` | `druid` |
| Shaman | Elemental | `elemental` | `shaman` |
| Shaman | Enhancement | `enhancement` | `shaman` |
| Shaman | Restoration | `restoration` | `shaman` |
| Warlock | Affliction | `affliction` | `warlock` |
| Warlock | Demonology | `demonology` | `warlock` |
| Warlock | Destruction | `destruction` | `warlock` |
| Warrior | Arms | `arms` | `warrior` |
| Warrior | Fury | `fury` | `warrior` |
| Warrior | Protection | `protection` | `warrior` |
| Monk | Brewmaster | `brewmaster` | `monk` |
| Monk | Windwalker | `windwalker` | `monk` |
| Monk | Mistweaver | `mistweaver` | `monk` |
| Demon Hunter | Havoc | `havoc` | `demon-hunter` |
| Demon Hunter | Vengeance | `vengeance` | `demon-hunter` |
| Death Knight | Blood | `blood` | `death-knight` |
| Death Knight | Frost | `frost` | `death-knight` |
| Death Knight | Unholy | `unholy` | `death-knight` |
| Evoker | Devastation | `devastation` | `evoker` |
| Evoker | Preservation | `preservation` | `evoker` |
| Evoker | Augmentation | `augmentation` | `evoker` |
