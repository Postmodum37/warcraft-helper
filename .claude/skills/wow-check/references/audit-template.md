# Full Character Audit Template

Output format for the `/wow-check` full audit pipeline.

## Section Order

1. **M+ Standing** (Raider.IO) -- fast, free, establishes character identity
2. **Build Check** (Archon + Murlok) -- talent/gear comparison against meta
3. **Gear Optimization** (SimCraft) -- sim-based upgrade recommendations
4. **Recent Performance** (WarcraftLogs) -- raid parse history

This order is intentional: M+ first gives immediate context (score, spec, ilvl), build check uses the detected spec, gear sims build on that, and performance data rounds out the picture.

## Template

```
== CHARACTER AUDIT: [Name] - [Realm] ([Region]) ==
[Class] -- [Spec] | [Item Level] | [Guild or "No guild"]

--- M+ STANDING (Raider.IO) ---
Score: [score] ([color name]) | [Role] Rank: [realm] realm / [region] region
Best runs:
  [Dungeon Short] +[level] [timed/depleted] ([time] / [par]) -- [score]
  [...]
Score gaps (biggest improvement opportunities):
  [Dungeon] -- current best: +[level] ([score]), push to +[target] for +[gain] score
  [...]
Missing dungeons: [list any with no runs]

--- BUILD CHECK (Archon + Murlok) ---
Spec tier: [S/A/B/C] for [content type] (Archon)
Meta build match: [X/Y talents match] | [differences noted]
Talent divergences:
  [talent name] -- you: [choice], meta: [choice] ([popularity]%)
Enchants/Gems:
  [slot]: [current] -> recommended: [meta choice] ([popularity]%)
  [only list mismatches]

--- GEAR OPTIMIZATION (SimCraft) ---
[If SimHammer available:]
Stat weights: [Stat]: [weight], [Stat]: [weight], ...
Top upgrade slots: [slot] ([current ilvl] -> [target])
Vault recommendation: [which row/slot offers best expected gain]

[If SimHammer not available:]
Sim section skipped -- SimHammer not running at [URL]
Start with: cd /path/to/simcraft && docker compose up --build

--- RECENT PERFORMANCE (WarcraftLogs) ---
Latest raid: [raid name] ([difficulty]) -- [X/Y bosses, date]
Median parse: [percentile]% ([color])
Best parse: [boss] [percentile]% ([color])
Worst parse: [boss] [percentile]% ([color])
Trend: [improving/declining/stable] over last [N] logs

---
Want to dig deeper?
- "Show my M+ gaps" -- detailed score optimization
- "Show my build vs meta" -- full talent/gear comparison
- "Sim my character" -- run a fresh simulation (requires SimC addon string)
- "Review my last raid" -- use /raid-review for mechanic analysis
```

## Graceful Degradation

When a spoke fails or is unavailable, skip that section with a brief explanation instead of failing the entire audit:

- **Raider.IO unreachable:** Skip M+ section. Note: "M+ data unavailable -- Raider.IO may be down. Try again later or use /raiderio directly."
- **Character not found on RIO:** Report what was found, note the character may be new or have a name/realm typo.
- **Archon/Murlok fetch fails:** Skip build check. Note: "Build comparison unavailable -- could not fetch meta data from Archon/Murlok."
- **SimHammer not running:** Skip gear optimization with the startup instructions shown in the template.
- **WarcraftLogs credentials missing or API error:** Skip performance section. Note: "Raid performance unavailable -- WCL credentials not configured or API error."
- **No raid logs found:** Show the section header but note "No raid logs found for current tier" instead of omitting it silently.

Always complete the audit with whatever data is available. A partial audit is more useful than no audit.
