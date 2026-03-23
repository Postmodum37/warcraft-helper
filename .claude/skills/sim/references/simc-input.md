# SimC Profile Input Reference

## Getting a SimC Profile

### Method 1: SimC Addon (Recommended)

1. Install the "Simulationcraft" addon in WoW (available on CurseForge)
2. In-game, type `/simc`
3. A text window appears with your full character profile
4. Copy the entire text — this is your SimC addon string

### Method 2: Manual / Armory Import

SimC can import directly from the WoW Armory using:
```
armory=us,illidan,charactername
```
However, this is less reliable than the addon export since the Armory may be cached or missing equipped items.

---

## SimC Profile Format

A SimC addon export looks like this:

```
warrior="Charactername"
level=80
race=orc
region=us
server=illidan
role=attack
professions=mining=100/blacksmithing=100
spec=fury

talents=CYQAAAAAAAAAAAAAAAAAAAAAAAAAgUSSkkIJJaSSSSSSSSA

head=,id=212065,bonus_id=10870/10395/10274/1511/10255
neck=,id=225577,bonus_id=10421/10395/10356/10879/10397/1630/10255
shoulder=,id=212063,bonus_id=10870/10395/10274/1511/10255
back=,id=222817,bonus_id=10421/10395/10356/10879/1617/10255
chest=,id=212060,bonus_id=10870/10395/10274/1511/10255
wrist=,id=219334,bonus_id=10421/10395/10274/1617/10255
hands=,id=212064,bonus_id=10870/10395/10274/1511/10255
waist=,id=219331,bonus_id=10421/10395/10274/1617/10255
legs=,id=212062,bonus_id=10870/10395/10274/1511/10255
feet=,id=219333,bonus_id=10421/10395/10356/10879/1617/10255
finger1=,id=225578,bonus_id=10421/10395/10356/10879/10397/1630/10255
finger2=,id=225576,bonus_id=10421/10395/10356/10879/10397/1630/10255
trinket1=,id=219314,bonus_id=6652/10256/1607/10255
trinket2=,id=178708,bonus_id=6652/10256/1607/10255
main_hand=,id=222446,bonus_id=10421/10395/10356/10879/1617/10255
off_hand=,id=222446,bonus_id=10421/10395/10356/10879/1617/10255
```

Key fields:
- Character metadata (name, level, race, region, server, spec)
- `talents=` — encoded talent loadout string
- Gear lines — each slot with `id` (item ID) and `bonus_id` (determines ilvl, sockets, tertiary stats, etc.)
- Some items also include `enchant_id=`, `gem_id=`, or `crafted_stats=`

---

## Sim Types

| Sim Type       | What It Does                                                       | When to Use                                                    |
|----------------|--------------------------------------------------------------------|----------------------------------------------------------------|
| **Quick Sim**  | Simulates current gear for a DPS estimate                          | "How much DPS should I be doing?" "Sim my character"           |
| **Stat Weights**| Calculates relative value of each stat                            | "What stats should I prioritize?" "Stat weights"               |
| **Top Gear**   | Compares combinations of gear in bags to find the best setup       | "What's my best gear?" "Which combo of trinkets is best?"      |
| **Gear Compare**| Compares two specific items head-to-head                          | "Is this an upgrade?" "Compare these two items"                |
| **Drop Finder**| Simulates potential drops from raids/dungeons to find upgrades      | "What bosses should I prioritize?" "Best upgrades from raid?"  |

### Quick Sim
Submit the SimC profile as-is. Returns a single DPS number with error margin and ability breakdown.

### Stat Weights
Same as Quick Sim but with `sim_type: "stat_weights"`. Returns DPS plus a stat weight table showing the relative value of Intellect/Strength/Agility, Haste, Mastery, Crit, and Versatility.

### Top Gear
Requires specifying which item slots to compare and which alternative items are available. The sim runs all viable combinations and ranks them. Good for "I have 3 trinkets, which 2 should I use?"

### Gear Compare
A simplified version of Top Gear — compare a specific item against what's currently equipped. Useful for "is this ring an upgrade?"

### Drop Finder (Droptimizer)
Provide a list of potential drop items (from a raid or dungeon). The sim equips each one and compares DPS to current gear, showing which items would be the biggest upgrades and from which bosses.
