---
name: sim
description: Run SimulationCraft simulations and fetch Raidbots data for gear comparison, stat weights, top gear optimization, and talent comparison. Use when the user asks "is this an upgrade", "sim my character", "stat weights", "what stats should I prioritize", "best gear", "top gear", "compare these items", "vault recommendation", or mentions SimC, SimulationCraft, Raidbots, or simming. Also use when the user pastes a SimC addon string or a Raidbots report URL.
---

# Sim Skill

You can run SimulationCraft simulations via a local SimHammer instance and fetch existing sim reports from Raidbots. This lets you answer gear questions, calculate stat weights, find best-in-slot combinations, and identify raid/dungeon upgrade targets.

## Setup Requirements

### SimHammer (for new sims)
- Self-hosted SimC frontend running in Docker
- Default URL: `http://localhost:8000` (configurable via `SIMHAMMER_URL` in `.env`)
- No API keys needed -- all local
- See `references/simhammer-api.md` for full API docs

### Raidbots (for existing reports)
- Public read-only endpoints, no auth required
- Fetch completed sim reports by report ID
- Fetch static game data (items, talents, instances, bonuses)
- See `references/raidbots-data.md` for available data

## How It Works

### New simulations (via SimHammer)

1. Get the user's SimC addon string (they paste it, or you ask for it)
2. Save it to a temporary `.simc` file
3. Run the appropriate sim via the wrapper script:
   ```bash
   <skill-path>/scripts/sim.sh quick-sim /path/to/profile.simc
   <skill-path>/scripts/sim.sh stat-weights /path/to/profile.simc
   <skill-path>/scripts/sim.sh top-gear /path/to/profile.simc
   <skill-path>/scripts/sim.sh droptimizer /path/to/profile.simc
   ```
4. The script handles health check, submission, polling, and result fetching
5. Interpret and present the results

### Existing reports (via Raidbots)

When the user provides a Raidbots URL like `https://www.raidbots.com/simbot/report/ABC123`:
1. Extract the report ID (`ABC123`)
2. Fetch results: `<skill-path>/scripts/raidbots.sh report ABC123`
3. Interpret and present the results

### Static game data (via Raidbots)

For item lookups, instance data, talent trees:
```bash
<skill-path>/scripts/raidbots.sh static item-names
<skill-path>/scripts/raidbots.sh static instances
<skill-path>/scripts/raidbots.sh static bonuses
```

## Getting Character Input

### SimC addon string
The user should paste their SimC addon export. It starts with a line like `warrior="Charactername"` and includes gear lines with `id=` and `bonus_id=`. See `references/simc-input.md` for the full format.

If the user says "sim my character" without providing a profile, ask them to:
1. Install the SimulationCraft addon in WoW
2. Type `/simc` in-game
3. Copy and paste the full output

### Raidbots URL
Extract the report ID from `https://www.raidbots.com/simbot/report/{id}`.

### Character name (for armory import)
If the user only provides a character name + server, you can construct an armory import line:
```
armory=us,illidan,charactername
```
But warn that the addon export is more accurate since the Armory can be cached.

## Sim Types

| Type            | Script Command  | When to Use                                          |
|-----------------|-----------------|------------------------------------------------------|
| **Quick Sim**   | `quick-sim`     | "How much DPS should I do?" "Sim my character"       |
| **Stat Weights**| `stat-weights`  | "What stats should I prioritize?" "Stat weights"     |
| **Top Gear**    | `top-gear`      | "Best gear combo?" "Which trinkets should I use?"    |
| **Droptimizer** | `droptimizer`   | "What bosses should I kill?" "Best raid upgrades?"   |

### Quick Sim
Submit the profile as-is. Returns DPS estimate with error margin and ability breakdown.

### Stat Weights
Returns DPS plus a stat weight table. Useful for telling the user which stats to gem/enchant for.

### Top Gear
Requires additional item data beyond the base profile. The SimHammer API accepts `selected_items` and `items_by_slot` to specify which slot alternatives to compare. Best for "I have these 3 trinkets, which 2 are best?"

### Droptimizer
Requires a list of potential drop items. Sims each against current gear and shows DPS delta. Best for "which boss drops are upgrades for me?"

## Presenting Results

### DPS
- Format large numbers: `1,234,567` or `1.23M DPS`
- Always include the error margin: `1.23M +/- 1.2k DPS`
- For comparisons, show the delta: `+45,000 DPS (+3.6%)`

### Stat Weights
Present as a ranked list with the primary stat normalized to 1.0:
```
Intellect:    1.00
Haste:        0.85
Mastery:      0.72
Critical:     0.68
Versatility:  0.65
```
Explain what this means in practical terms: "Haste is your best secondary -- gem and enchant for Haste first."

### Gear Comparisons (Top Gear / Droptimizer)
- Show results sorted by DPS, highest first
- Highlight the DPS difference from currently equipped
- For Top Gear: show which items are in each combo
- For Droptimizer: show which boss drops each item, grouped by instance

### Ability Breakdown
When showing ability DPS, list the top 5-8 abilities by damage contribution. This helps validate the sim is running the correct rotation.

## Error Handling

| Error                          | What to Do                                                    |
|--------------------------------|---------------------------------------------------------------|
| SimHammer not running          | Tell user to start Docker: `docker compose up -d`             |
| Simulation failed              | Show the simc error message -- usually a bad profile string   |
| Simulation timed out           | Suggest reducing iterations or checking SimHammer resources    |
| No SimC profile provided       | Ask user to install the addon and run `/simc` in-game         |
| Raidbots 404                   | Report ID may be expired (reports last ~30 days)              |
| Raidbots restricted            | Some report data may be subscriber-only                       |

## Reference Files

- `references/simhammer-api.md` — Full SimHammer REST API documentation
- `references/raidbots-data.md` — Raidbots public endpoints and static data keys
- `references/simc-input.md` — SimC profile format and how to obtain it
