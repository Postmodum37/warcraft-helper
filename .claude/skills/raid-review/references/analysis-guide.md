# Analysis Guide

Framework for interpreting WarcraftLogs data and identifying actionable improvement areas.

## Priority Order

Analyze and report problems in this order. Higher priority issues are mentioned first and get more detail.

1. **Wipe causes** — what killed the raid?
2. **Repeated mechanic deaths** — same player dying to same ability across pulls
3. **Avoidable damage outliers** — players taking far more avoidable damage than peers
4. **Role-specific failures** — detected indirectly through deaths/damage patterns
5. **Severe underperformance** — very low parses combined with mechanical issues

## Reading Deaths Data

The deaths table (`dataType: Deaths`) returns entries with:
- `name` — player who died
- `id` — player ID
- `deathEvents` — array of damage events leading to death, including the killing blow

**How to use:**
- Group deaths by ability name to find repeated mechanic failures
- The killing blow ability name often reveals the mechanic (e.g., "Shadow Orb Explosion" = failed to soak/dodge orbs)
- Count deaths per player per ability across all fights — 3+ deaths to the same ability is a clear pattern
- Deaths in the first 30 seconds of a pull are usually positioning errors
- Deaths in the last 15 seconds before a wipe are often cascade failures (less individually actionable)

## Reading Damage Taken Data

The damage taken table (`dataType: DamageTaken`) returns per-player totals with ability breakdowns.

**Identifying avoidable damage:**
- Use WoW knowledge to classify abilities. Common avoidable patterns:
  - Abilities with "soak", "dodge", "move", "spread", "stack" in their encounter journal descriptions
  - Abilities that hit some players but not all (if 12 players are in the fight but only 4 took damage from an ability, it's probably avoidable)
  - Ground effects, frontal cleaves, targeted circles
- Common unavoidable patterns:
  - Raid-wide pulses that hit everyone equally
  - Abilities where every player takes roughly the same damage
  - Tank-only mechanics (unavoidable for tanks, shouldn't hit others)

**Flagging outliers:**
- For a given avoidable ability, calculate the raid average damage taken
- Flag any player taking **>2x the raid average** for that ability
- Ignore players who took 0 damage (they may have been dead or not targeted)

## Reading Rankings Data

The rankings endpoint returns per-player parse percentiles for each encounter. The key field is `rankPercent` (overall percentile) — not `bracket` (which is the item level bracket).

**Percentile interpretation:**
- 99-100: gold (exceptional)
- 95-98: pink (excellent)
- 75-94: orange (great)
- 50-74: purple (good)
- 25-49: blue (average)
- 0-24: gray (below average)

**Underperformance flag:**
- Only flag if parse is **consistently gray (<25th percentile)** across multiple fights AND the player also has mechanical issues (deaths, high avoidable damage)
- A player with gray parses but zero deaths and low avoidable damage is probably undergeared or learning a new spec — not actionable via mechanic tips
- **Do NOT flag** minor parse differences (45th vs 55th is noise at Normal/Heroic)

## Fight Duration Analysis

Compare kill times for the same boss within the report (or across difficulties). Fight start/end times are already available from the overview query — no extra API calls needed.

**Flagging slow kills:**
- If the report has multiple kills of the same boss, compare durations. A kill that's >30% longer than the fastest kill may indicate deaths during the fight that were recovered from.
- For single kills, compare fight duration to the group's raid size and difficulty. A 10-minute Heroic fight for a boss that groups typically kill in 5-6 minutes suggests significant issues.
- Long kills often correlate with early deaths — cross-reference with deaths data to confirm.
- Note slow kills in the boss summary but don't over-emphasize unless it contributed to wipes on later bosses (fatigue, cooldown availability).

## Wipe Cascade Analysis

When analyzing a wipe:

1. **Find the first death(s)** — sort deaths by timestamp, look at the earliest
2. **Identify the trigger** — what ability caused the first death? Was it avoidable?
3. **Trace the cascade** — did losing a healer lead to the raid being unable to sustain through the next mechanic? Did losing DPS mean the boss hit an enrage or extra phase?
4. **Root cause attribution** — the wipe cause is the trigger event, not the final "everyone died" moment
5. **If >3 people die to the same ability simultaneously** — this is likely a raid-wide mechanic failure (missed soak, failed spread, wrong positioning), not an individual problem

## Role-Specific Patterns

### Tank Failures (detected indirectly)
- Death with high stacks of a debuff → missed tank swap
- Death from a frontal/cleave ability → bad positioning
- Multiple deaths in quick succession after tank death → raid lost aggro control

### Healer Failures (detected indirectly)
- Multiple players dying to non-lethal mechanics (took damage but should have been healed) → healing throughput or cooldown timing issue
- This is usually a raid-wide observation, not individual blame — note it as "healing pressure was high during [phase/mechanic]"

### DPS Failures (detected indirectly)
- Dying to easily avoidable mechanics → tunnel visioning the boss, not watching for mechanics
- Deaths during movement-heavy phases → not adapting rotation to mechanics

## Tone Rules

- **Constructive:** "died to X 4 times — here's a clip showing safe positions" not "keeps failing X"
- **Action-oriented:** Focus on what to do differently, not what went wrong
- **Brief:** 2-3 action items per player maximum
- **Encouraging:** Resources are help, not homework
- **Honest:** If the raid's biggest issue is a mechanic that most people are failing, say so clearly — it's a group problem, not individual blame

## What NOT to Report

- Parse differences that don't matter (45th vs 55th percentile)
- One-off deaths that didn't contribute to a wipe
- Talent or gear optimization (out of scope)
- Healer cooldown assignment (that's officer strategy)
- Anything that requires event-level queries (interrupts, specific cast counts) — too API-expensive for v1
