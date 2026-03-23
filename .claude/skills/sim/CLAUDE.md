# Sim Project

This project contains a simulation skill for running SimulationCraft sims and fetching Raidbots data.

## Skill

The main skill is defined in `SKILL.md`. When answering sim or gear questions:

1. Read `SKILL.md` for instructions and decision logic
2. Consult `references/simhammer-api.md` for SimHammer API details
3. Consult `references/raidbots-data.md` for Raidbots public endpoints
4. Consult `references/simc-input.md` for SimC profile format
5. Run sims via `./scripts/sim.sh <command> <args>`
6. Fetch Raidbots data via `./scripts/raidbots.sh <command> <args>`

## Configuration

SimHammer URL is configured in `.env` (never commit this file). Defaults to `http://localhost:8000`.

## Dependencies

- SimHammer Docker container (for running new sims)
- Raidbots public API (for existing reports and static game data, no auth needed)
