# Warcraft Helper

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for World of Warcraft raid analysis, character audits, and theorycraft. Query WarcraftLogs, Raider.IO, Archon, Murlok.io, and Raidbots — all from the CLI.

## Skills

### `/warcraftlogs`

Query the [WarcraftLogs v2 GraphQL API](https://www.warcraftlogs.com/v2-api-docs/warcraft/) for raid and M+ data:

- Character parses and rankings
- Guild progression
- Report analysis (fights, deaths, damage taken)
- M+ scores and dungeon performance
- Multi-character comparisons

### `/raid-review`

Analyze a full raid session from a WarcraftLogs report URL. Produces:

- Boss-by-boss summary with kill/wipe status
- Death analysis and wipe cascade breakdowns
- Avoidable damage outliers
- Per-player improvement profiles with mechanic-specific tips
- Linked video guides and community resources for each problem mechanic

### `/raiderio`

Query the [Raider.IO API](https://raider.io/api) for Mythic+ and raid data:

- M+ scores and rankings by season
- Recent and best run history per dungeon
- Realm and region leaderboards
- Current affix rotation
- Character and guild profiles

### `/archon`

Fetch data from [Archon.gg](https://www.archon.gg/wow) via web scraping:

- Spec tier lists for M+ and raid
- Meta talent builds with import strings
- BiS gear recommendations
- Stat priority and gearing strategies

### `/murlok`

Look up what top players are actually running from [Murlok.io](https://murlok.io):

- Most popular talent builds among top players (M+ and PvP)
- Gear, enchant, and gem choices
- Stat distributions across top performers

> **Note:** Murlok.io renders data client-side via WASM, so HTML scraping yields empty shells. This skill uses `WebFetch` to grab the initial HTML and then parses what structured data is available (hero talent tree names, nav structure). For full build details, it falls back to Archon or directs users to murlok.io.

### `/sim`

Run SimulationCraft simulations via [SimHammer](https://github.com/simulationcraft/SimHammer) and fetch static data from [Raidbots](https://www.raidbots.com):

- DPS/HPS simulations from SimC input strings or addon exports
- Stat weights and gear comparison
- Raidbots talent and trinket data (no API key needed)

### `/wow-check`

Smart router that answers any WoW question by picking the right skill(s) automatically:

- Routes questions to the appropriate skill based on intent
- Full character audits combining data from all sources
- Compares current gear/talents against meta recommendations

## Setup

### Core (required)

1. Clone this repo:
   ```
   git clone https://github.com/Postmodum37/warcraft-helper.git
   ```

2. Get WarcraftLogs API credentials at https://www.warcraftlogs.com/api/clients/ (create a v2 client).

3. Create `.claude/skills/warcraftlogs/.env`:
   ```
   WCL_CLIENT_ID=your_client_id
   WCL_CLIENT_SECRET=your_client_secret
   ```

4. Open the project in Claude Code:
   ```
   cd warcraft-helper
   claude
   ```

The skills are auto-discovered from `.claude/skills/`.

### No setup needed

The following skills work out of the box with no credentials:

- **`/raiderio`** — Uses the public Raider.IO API (no key required)
- **`/archon`** — Scrapes public Archon.gg pages via `WebFetch`
- **`/murlok`** — Scrapes public Murlok.io pages via `WebFetch`
- **`/wow-check`** — Orchestrates other skills (works with whatever skills are configured)

### `/sim` setup (optional)

SimulationCraft simulations require a local [SimHammer](https://github.com/simulationcraft/SimHammer) instance:

1. Install Docker.

2. Pull and run SimHammer:
   ```
   docker pull ghcr.io/simulationcraft/simhammer:latest
   docker run -d -p 8080:8080 ghcr.io/simulationcraft/simhammer:latest
   ```

3. Create `.claude/skills/sim/.env`:
   ```
   SIMHAMMER_URL=http://localhost:8080
   ```

The Raidbots static data features (talent data, trinket lists) work without SimHammer.

## Usage

```
> /warcraftlogs How are my parses for Tomasn on Ragnaros EU?

> /raid-review https://www.warcraftlogs.com/reports/ABC123

> /raiderio What's the M+ score for Ellesmere on Area-52 US?

> /archon What's the tier list for M+ healers?

> /murlok What are top resto druids running in M+?

> /sim Sim this character: <paste SimC input>

> /wow-check Full audit for Tomasn on Ragnaros EU
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- WarcraftLogs API v2 credentials (for `/warcraftlogs` and `/raid-review`)
- `curl` and `jq` (used by query scripts)
- Docker (optional, for `/sim` SimHammer simulations)
