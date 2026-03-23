# Warcraft Helper

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for World of Warcraft raid analysis. Query WarcraftLogs data and get mechanic-focused improvement feedback — all from the CLI.

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

## Setup

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

## Usage

```
> /warcraftlogs How are my parses for Tomasn on Ragnaros EU?

> /raid-review https://www.warcraftlogs.com/reports/ABC123
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- WarcraftLogs API v2 credentials
- `curl` and `jq` (used by the query script)
