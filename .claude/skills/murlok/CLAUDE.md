# Murlok

Murlok.io skill for looking up what top-ranked players are actually running.

## Skill

The main skill is defined in `SKILL.md`. When answering "what are top players using" questions:

1. Read `SKILL.md` for instructions and decision logic
2. Use URL patterns from `references/urls.md`
3. Follow extraction/fallback instructions in `references/parsing.md`
4. Fetch pages using WebFetch tool (may hit WASM limitation)

## No Credentials Required

Murlok.io data is publicly accessible. No API key needed.

## Limitations

- **WASM rendering** means WebFetch may return empty content for spec build pages
- **Meta pages work** — `/meta/{role}/{mode}` returns actual ranking data
- **No raid data** — M+ and PvP only
- Falls back to providing URLs + supplementing with Archon data

## Current Content (Midnight Expansion)

- Current M+: Midnight Season 1
- Data: top 50 players per spec, refreshed every 8 hours
