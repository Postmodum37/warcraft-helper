---
name: wow-check
description: Smart router for all WoW questions — routes to the right data source automatically. Use for any general WoW question that could involve multiple data sources, for full character audits, or when the user says "check me", "audit my character", "wow check", or asks a broad WoW question without specifying a data source. Also catches questions that could go to raiderio, archon, murlok, sim, or warcraftlogs when the user doesn't invoke a specific skill. Think of this as the "I have a WoW question" catch-all.
---

# WoW Check — Hub Skill

Smart router that classifies WoW questions and dispatches them to the right spoke skill(s), then synthesizes a unified answer.

## Dependencies

Before starting, verify access to all five spoke skills:
- `${CLAUDE_SKILL_DIR}/../raiderio/SKILL.md` — M+ scores, runs, rankings (Raider.IO API)
- `${CLAUDE_SKILL_DIR}/../archon/SKILL.md` — Tier lists, meta builds, gear (Archon.gg)
- `${CLAUDE_SKILL_DIR}/../murlok/SKILL.md` — Top player builds (Murlok.io)
- `${CLAUDE_SKILL_DIR}/../sim/SKILL.md` — SimulationCraft sims (SimHammer Docker + Raidbots)
- `${CLAUDE_SKILL_DIR}/../warcraftlogs/SKILL.md` — Raid/M+ combat logs (WarcraftLogs API)

Each spoke has its own scripts and references. Read the spoke's SKILL.md for invocation instructions before calling it.

## How It Works

1. **Classify intent** — Read the user's question and determine which spoke(s) to invoke. See `references/routing.md` for the full routing table.
2. **Announce plan** — Tell the user which data sources you're querying and why, so they know what to expect.
3. **Invoke spoke(s)** — Follow each spoke's SKILL.md instructions. For multi-spoke queries, run independent spokes in sequence (the hub synthesizes, spokes execute).
4. **Synthesize** — Combine results into a single coherent answer. Don't just paste raw spoke outputs together — interpret, compare, and highlight what matters.

## Full Character Audit

When the user says "check me", "audit my character", or provides just a character name + realm without a specific question, run the full audit pipeline.

Read `references/audit-template.md` for the output format.

### Pipeline

**Step 1: Raider.IO (always first)**
Query Raider.IO via `${CLAUDE_SKILL_DIR}/../raiderio/scripts/rio.sh` to get:
- Character identity: class, spec, item level, guild
- M+ score, best runs, rankings
- Score gap analysis (which dungeons to push)

This establishes the character's identity and current spec for all downstream lookups.

**Step 2: Archon + Murlok (build check)**
Using the spec detected in Step 1:
- Fetch the meta build from Archon (tier ranking, talents, gear, enchants, gems)
- Fetch top player builds from Murlok (what the top 50 are actually running)
- Compare the character's build against meta and flag divergences

**Step 3: SimCraft (gear optimization)**
If SimHammer is running:
- Run a quick sim for stat weights
- Identify top upgrade slots and vault recommendations

If SimHammer is not available, skip with a note and startup instructions.

**Step 4: WarcraftLogs (recent performance)**
Query WarcraftLogs via `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh` to get:
- Recent raid parses (zone rankings for current tier)
- Median and best/worst percentiles
- Performance trend

If WCL credentials are not configured or the character has no logs, skip with explanation.

## Routing

See `references/routing.md` for:
- Single-spoke routing table (intent -> keywords -> spoke)
- Multi-spoke routing table (intent -> keywords -> spokes)
- Ambiguous query handling
- Character resolution strategy

## Hub vs Direct Invocation

**Use the hub when:**
- The question spans multiple data sources ("am I raid ready?")
- The user wants a full audit
- The intent is ambiguous and might need multiple spokes
- The user says "wow check" or asks a broad WoW question

**Use spokes directly when:**
- The user invokes a specific skill by name (/raiderio, /archon, etc.)
- The question clearly maps to a single data source
- The user wants raw/detailed output from one source (e.g., full WCL report analysis)

If the user invokes the hub but the question clearly maps to a single spoke, route to that spoke — but still frame the answer through the hub (brief context from other sources if relevant).

## Hub and /raid-review

The hub calls `/warcraftlogs` directly for parse data — it does NOT invoke `/raid-review`. These are different use cases:
- Hub + WCL: "What are my parses?" — fetches zone rankings, percentiles, summary stats
- /raid-review: "Review this raid log" — deep mechanic-by-mechanic analysis of a specific report

If the user asks for a raid review through the hub, redirect them to use `/raid-review` directly with a WarcraftLogs URL.

## Error Handling

### Spoke Failure
If a spoke fails (API error, timeout, missing credentials), skip that section with a clear explanation and continue with remaining spokes. A partial answer is better than no answer.

### Character Not Found
If Raider.IO returns no results:
- Double-check name and realm spelling with the user
- Try common realm name variations (e.g., "Area 52" vs "area-52")
- If still not found, the character may be too new, inactive, or on a region not checked

### All Spokes Fail
If every spoke fails, report what went wrong for each and suggest:
- Check internet connectivity
- Verify API credentials (WCL)
- Check if SimHammer is running (sim)
- Try individual spokes to isolate the issue

### Ambiguous Query
When you can't confidently classify intent:
1. Make your best guess based on context
2. State your interpretation explicitly
3. Provide the answer based on that interpretation
4. Offer to redirect if the user meant something else

Example: "I'm reading this as a M+ question, so I'll pull your Raider.IO data. If you meant raid parses or build advice instead, just let me know."
