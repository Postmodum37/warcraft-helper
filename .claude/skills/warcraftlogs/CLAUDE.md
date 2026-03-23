# WarcraftLogs Project

This project contains a WarcraftLogs API skill for querying WoW raiding and M+ data.

## Skill

The main skill is defined in `SKILL.md`. When answering any WoW-related question:

1. Read `SKILL.md` for instructions and decision logic
2. Use query templates from `references/queries.md`
3. Consult `references/schema.md` for the full API schema
4. Execute queries via `./scripts/wcl.sh '<GRAPHQL_QUERY>'`

## Credentials

API credentials are stored in `.env` (never commit this file). The `wcl.sh` script loads them automatically.

## Current Content (Midnight Expansion)

- Current raid: VS / DR / MQD (zone 46)
- Current M+ season: Midnight Season 1 (zone 47)
