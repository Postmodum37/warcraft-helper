---
name: raid-review
description: Analyze a WarcraftLogs raid report and provide mechanic-focused improvement feedback with video/guide resources. Use when the user says "raid review", "review this raid", "analyze this log for improvement", or invokes /raid-review with a WarcraftLogs URL. Do NOT activate on general WarcraftLogs questions — those are handled by the warcraftlogs skill.
---

# Raid Review Skill

Analyze a WarcraftLogs raid report and produce actionable improvement feedback for raiders. Identifies mechanic failures, flags underperformance, and finds relevant video guides and community resources.

## Dependencies

Before starting, verify access to:
- `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh` — API query execution
- `${CLAUDE_SKILL_DIR}/../warcraftlogs/references/queries.md` — query templates
- Read `<skill-path>/references/analysis-guide.md` — analytical framework
- Read `<skill-path>/references/resource-sources.md` — resource discovery strategy

## Pipeline

### Step 1: Extract Report Code

Extract the report code from the WarcraftLogs URL:
- `https://www.warcraftlogs.com/reports/ABC123` → code is `ABC123`
- `https://www.warcraftlogs.com/reports/ABC123#fight=5` → code is `ABC123` (ignore fragment)

If no URL is provided, ask the user for one.

### Step 2: Check Rate Limit

Run query template #14 (rate limit check) via `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh`:

```
${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh '{ rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn } }'
```

Estimate the query budget for this report: 1 rate limit check + 1 overview + N combined death/damage queries + K rankings queries (kills only). For a 15-fight report with 8 kills, that's ~25 queries. Compare this estimate against remaining API points. If insufficient, warn the user and suggest waiting or prioritizing wipe fights only.

### Step 3: Report Overview

Run a combined query for report overview + master data (saves API points):

```graphql
{
  reportData {
    report(code: "$CODE") {
      title
      startTime
      endTime
      zone { name }
      guild { name }
      masterData(translate: true) {
        actors(type: "Player") {
          id
          name
          subType
          server
        }
      }
      fights(killType: Encounters) {
        id
        encounterID
        name
        kill
        startTime
        endTime
        difficulty
        size
      }
    }
  }
}
```

Execute via: `${CLAUDE_SKILL_DIR}/../warcraftlogs/scripts/wcl.sh '<query>'`

From the response, build:
- **Player roster:** name, spec (subType), ID mapping
- **Fight list:** boss name, kill/wipe, duration, difficulty, fight ID
- **Session summary:** total duration, kill count, wipe count, progression status

Handle errors:
- Null report → "This log appears to be private or the URL may be incorrect."
- No encounter fights → "This report doesn't contain any boss encounters."

### Step 4: Analyze Fights

For each boss encounter (prioritize wipes first, then messy kills, then clean kills last).

**Multiple kills of the same boss:** A report may contain re-kills (e.g., Normal then Heroic, or re-clears). Analyze each fight separately — they may be different difficulties. Group them in the boss summary output (e.g., "Crown of the Cosmos (Normal) — Kill (4:23)" and "Crown of the Cosmos (Heroic) — 3 wipes").

**4a. Deaths query** — query template #6:
```graphql
{
  reportData {
    report(code: "$CODE") {
      table(dataType: Deaths, fightIDs: [$FIGHT_ID])
    }
  }
}
```

**4b. Damage taken query** — query template #5 with DamageTaken:
```graphql
{
  reportData {
    report(code: "$CODE") {
      table(dataType: DamageTaken, fightIDs: [$FIGHT_ID], hostilityType: Friendlies)
    }
  }
}
```

**4c. Rankings query** — query template #7 (only for kills, not wipes):
```graphql
{
  reportData {
    report(code: "$CODE") {
      rankings(encounterID: $ENCOUNTER_ID, difficulty: $DIFFICULTY)
    }
  }
}
```

**Combine queries where possible** using GraphQL aliases to save API points:
```graphql
{
  reportData {
    report(code: "$CODE") {
      deaths: table(dataType: Deaths, fightIDs: [$FIGHT_ID])
      damageTaken: table(dataType: DamageTaken, fightIDs: [$FIGHT_ID], hostilityType: Friendlies)
    }
  }
}
```

For each fight, apply the analysis framework from `references/analysis-guide.md`:
- Identify deaths and their causes
- Find avoidable damage outliers (>2x raid average for an ability)
- Compare kill durations for the same boss — flag kills >30% slower than the fastest (uses fight start/end from Step 3, no extra queries)
- For wipes, perform cascade analysis (first death → trigger → cascade → wipe)
- For kills, note rankings data for underperformance detection

**API budget management:**
- If the report has >10 encounter fights, prioritize: all wipes first, then kills with deaths, skip clean one-shot kills
- Combine deaths + damage taken in a single query per fight using aliases
- Rankings only for kills (wipes don't generate rankings)

### Step 5: Build Player Profiles

Aggregate across all analyzed fights per player:
- Total deaths and causes (grouped by ability name)
- Abilities where they are a damage-taken outlier
- Parse percentiles across kills (from rankings data)
- Fights attended (for partial attendance tracking)

Apply underperformance flag logic from `references/analysis-guide.md`:
- Flag only if consistently gray (<25th percentile) AND has mechanical issues

### Step 6: Discover Resources

For each unique mechanic problem identified (e.g., "Shadow Orb damage on Crown of the Cosmos"):
1. Read `<skill-path>/references/resource-sources.md` for search strategy
2. Search the web using the patterns described there
3. Pick 1-2 best resources per mechanic (prefer visual content)
4. If no specific resource found, fall back to general boss guide

Group resources by mechanic (not by player) to avoid redundant searches — multiple players failing the same mechanic share the same resource links.

### Step 7: Output — Raid Overview (automatic)

Print the raid overview immediately. Format:

```
== RAID REVIEW: [Difficulty] [Raid Name] — [Date] ==
[X] players | [Duration] | [X/Y] [Difficulty] ([wipe count]x wipes on [boss])

--- BOSS SUMMARY ---
[For each boss, one line:]
[Boss Name] ([Difficulty]) — [Kill/Wipe] ([Duration or wipe count])
  [If notable issues: brief description]

--- RAID-WIDE ISSUES ---
[Ranked by wipe impact, max 5:]
1. [Mechanic] ([Boss]) — [impact description]
   Resource: [URL]

--- TOP 3 PRIORITIES FOR NEXT RAID ---
1. [Priority with brief action item]
2. [Priority with brief action item]
3. [Priority with brief action item]

---
What would you like to dig into?
- "Show [boss name] breakdown" — detailed fight analysis
- "Show [player name]'s report" — individual improvement feedback
- "Show all player reports" — everyone's feedback
- "What should we focus on?" — distilled priorities
```

### Step 8: Output — Interactive Drill-Down (on request)

**Boss breakdown** (when user asks about a specific boss):
- Per-pull timeline if multiple wipes
- Deaths per pull with causes
- Wipe cascade analysis
- Damage taken outliers for that fight
- Relevant resources

**Player report** (when user asks about a specific player):
```
--- [Player Name] ([Spec] [Class]) ---
Attended: [X/Y] fights

Mechanic Issues:
1. [Ability name] ([Boss]) — died [X] times
   What to do: [Brief actionable tip]
   Resource: [URL with description]

2. [Ability name] ([Boss]) — [damage outlier / other issue]
   What to do: [Brief actionable tip]
   Resource: [URL with description]

[If underperformance flag:]
Note: Parses are averaging in the [color] range ([X]th percentile).
Combined with the mechanic issues above, focusing on survival first
will naturally improve your numbers.
```

Keep to 2-3 action items max per player. Tone: constructive, action-oriented, resources as help not homework.

**All player reports** (when user asks for everyone):
- Print each player's report sequentially using the format above
- Order by: most issues first, clean players last
- Skip players with no notable issues (mention them at the end: "No major issues identified for: [names]")

## Error Handling

- **Null report:** "This log appears to be private or the URL may be incorrect. Check that the report is set to public or unlisted on WarcraftLogs."
- **No encounters:** "This report doesn't contain any boss encounters — it may be a trash-only or M+ log."
- **API rate limit exceeded:** "Rate limit reached. [X] points remaining, resets in [Y] minutes. Try again after the reset."
- **Token/credential error:** "WarcraftLogs API credentials not found. Check that WCL_CLIENT_ID and WCL_CLIENT_SECRET are set in ${CLAUDE_SKILL_DIR}/../warcraftlogs/.env"
- **Partial data:** If some queries fail, analyze what you can and note what was skipped.
- **Partial raids:** If the report contains fewer bosses than a full clear, analyze what's there without commenting on missing bosses. The logger may have joined late, crashed, or the raid may have been split across reports.
