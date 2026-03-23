# WoW Check

Hub/router skill that orchestrates all WoW data-source skills.

## Skill

The main skill is defined in `SKILL.md`. This is the catch-all WoW skill that:

1. Classifies user intent
2. Routes to the right spoke(s): raiderio, archon, murlok, sim, warcraftlogs
3. Synthesizes unified answers

## Dependencies

All sibling skills:
- `raiderio` — M+ scores, runs, rankings (Raider.IO API)
- `archon` — Tier lists, meta builds, gear (Archon.gg)
- `murlok` — Top player builds (Murlok.io, WASM-limited)
- `sim` — SimulationCraft sims (SimHammer Docker + Raidbots)
- `warcraftlogs` — Raid/M+ combat logs (WarcraftLogs API)

## Current Content (Midnight Expansion)

Defers to each spoke for current content defaults:
- Raid: VS / DR / MQD (zone 46)
- M+ Season: Midnight Season 1 (zone 47)
- Expansion: Midnight (ID 7)
