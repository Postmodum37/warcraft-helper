# Archon → NSRT reminder note

A userscript that adds an **NSRT** button to every row of the Cooldowns timeline on an
[Archon](https://www.archon.gg/wow/builds/holy/priest/raid/rotation/mythic/nekzali) raid
rotation page. Click it, tick the spells you want, and copy a
[Northern Sky Raid Tools](https://github.com/Reloe/NorthernSkyRaidTools) reminder note that
replays that top player's cooldown timings for your character.

## Why the timings line up

NSRT counts a reminder's `time` from the start of the **current phase**, and it detects
phases itself, with boss-specific logic (`EncounterAlerts/MidnightS2/*.lua`). A note written
with pull-relative times drifts as soon as your phase 1 is shorter or longer than the log's:
Nek'zali's phase 1 lasted anywhere from 83 s to 158 s across Archon's 14 top Mythic kills.

For bosses where NSRT changes phase, the script reads the log's boss events from the
WarcraftLogs API. It finds the moment NSRT switches phase and rewrites every cast as
`ph:<phase>;time:<seconds into that phase>`. The rules live in `ENCOUNTERS` at the top of
the script. Each rule was checked against NSRT's own Mythic boss timers on real kills.

| Boss | NSRT phases (Mythic) | Phase change found in the log as | Checked against NSRT's timers |
| --- | --- | --- | --- |
| Nek'zali the Soulcoiler | 1 → 1.5 → 1.75 → 2 | Ritual of Awakening cast ends, Echo's Soul Transfer cast starts, boss gains 1290003 | 14 kills, within 0.08 s |
| Entombed Sentinels | 1 → 2 → 3 → 4 → 5 | Vitriolic Stasis fades | 6 kills, within 0.05 s |
| The Lost Explorers | 1 → 2 → 3 → 4 | the empowered boss debuffs itself | 6 kills, within 0.11 s |
| The Coiled Altar | 1 → 2 → 2.5 → 3 | Dreadful Presence, Soulbinding, Defilement casts | 6 kills; phase 2 within 0.09 s (one cast 0.46 s), phase 3 within 0.4 s |
| Nymrissa, Vashnik, Sszorak, The Twin Fangs, Ula'tek | none: phase 1, timed from the pull | — | — |

The phased rules also found every phase change in all of Archon's current Mythic top logs
(11, 10 and 19 kills).

Any other encounter is refused rather than guessed.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/). In Chrome, also turn on **Allow User
   Scripts** in the extension's details page.
2. Create a new script, then paste `archon-nsrt.user.js` into it and save. In Tampermonkey you
   can also use *Utilities → Import from file*.
3. For bosses with phases, create a WarcraftLogs API client at
   <https://www.warcraftlogs.com/api/clients/>. Any name works; leave the redirect URL blank.
   The panel asks for its client ID and secret once, and keeps them in your userscript
   manager's storage.

   This is the one step lorrgs doesn't need. Archon's page has the player's casts but not
   the boss events that mark NSRT's phase changes, so only the log can say where each
   phase began. Without the client the panel shows no note for those bosses rather than a
   pull-timed one. Bosses without phases work with no client.

## Use

1. Open an Archon raid rotation page, e.g. *Holy Priest → Raid → Rotation → Mythic → Nek'zali*.
2. Click **NSRT** next to the log you want to copy.
3. Enter your character name as the tag. Personal reminders still only show for a matching
   tag. NSRT matches the name without its realm, so `Name-Realm` is cut to `Name`. Several
   tags separated by spaces work. So do spec IDs (`257`), roles (`healer`) and `everyone`,
   which is used when the field is empty.
4. Tick spells. Archon's default selection (the raid cooldowns) is preselected, and the panel
   remembers your choice per spec.
5. **Copy note**. In game, open NSRT → **Reminders** tab → **Personal** reminders → **Import**,
   then paste and confirm.

The note looks like this:

```
EncounterID:3470;Name:Nek'zali the Soulcoiler holy #1;Difficulty:Mythic
tag:Yourname;time:27.3;spellid:200183;ph:1
tag:Yourname;time:24.3;spellid:200183;ph:1.75
tag:Yourname;time:94.1;spellid:200183;ph:2
```

`time` is when the log's player pressed the spell. NSRT shows the reminder `dur` seconds
earlier (your NSRT default).

## Limits

- The timings copy one player's kill, so they fit your raid only as far as your phase lengths
  and boss timers match theirs. A cast late in a phase can be skipped if your raid pushes that
  phase faster.
- The phase rules mirror NSRT 12.1.26 (2026-10-05). If NSRT changes its phase detection, the
  rules need rechecking.
- The phase rules were checked on Mythic. On other difficulties the panel warns you.

## Tailored plan for your guild (`tailor/`)

The userscript copies one top player's kill. `tailor/` instead plans your own cooldowns for
your guild's kills, using the same NSRT phase rules. It is set up for Pawstyi (Holy Priest,
Divine Hymn and Apotheosis) in the guild Aspect; `CONFIG` in `collect.js` holds the guild,
player and spec, and `SPELLS` in `plan.js` the cooldowns.

```sh
node tailor/collect.js   # WarcraftLogs → tailor/data/; ~2,500 API points the first time, cached after
node tailor/report.js    # tailor/data/ → tailor/out/notes.txt and tailor/out/report.md
```

`data/`, `out/` and the response cache stay out of git: they hold guildmates' names.

`collect.js` uses the warcraftlogs skill's `.env` client. For each boss with Mythic pulls it
reads:

- **Your guild's Mythic kills with the player in them**, or the 8 best pulls of a boss not
  killed yet. From these it takes NSRT's phases, the player's casts, the other healers' raid
  cooldowns, and the raid's damage taken each second, tanks excluded.
- **The top 100 Holy Priest logs** on WarcraftLogs (Mythic, by HPS), with their phases and
  casts.

`report.js` plans each boss from that data:

1. Your pace is the median phase lengths of your kills. Before a first kill, it is the best
   pull, projected to a kill at the same rate of boss health loss.
2. The 20 top logs whose phases ran closest to your pace are kept. Anonymous rankings
   are skipped, since their casts can't be read.
3. A cast at a given second scores the raid damage your pulls took in the spell's window:
   3s before to 5s after a Divine Hymn, the 32s of Apotheosis. Damage inside another
   healer's raid cooldown counts half; that covers Aura Mastery, Spirit Link, Healing Tide,
   Tranquility, and Divine Hymn, plus your own planned Divine Hymns when Apotheosis is
   scored. The score triples where all 20 top priests cast within 5s, and rises in
   proportion where only some do.
4. The plan is the highest-scoring set of casts where each cast comes at least the
   2-minute cooldown plus 2s after the one before, in each of your kills. Within a phase
   that's followed by another, it plans only as far as every kill lasted, so no kill skips
   one reminder and then gets the next one too early. A future kill with a phase shorter
   than your shortest yet can still bring a reminder before the spell is back.

`out/report.md` shows each cast with its NSRT time, its time in your median kill, how many
top priests agree, the damage and biggest hits it answers, the other healers' cooldowns
already there, and whether you already cast it there. With two or more kills, it also
tests the plan on each kill, using a plan made from your other kills only. The test
compares the raid damage that plan's casts answer in that kill with the damage your own
casts answered.

Limits:

- The damage profile comes from your raid's past kills, so a change of strategy shifts it.
  Rerun both scripts after new kills.
- A boss with one kill is planned from that kill alone.
- Guardian Spirit is left out. It answers tank damage, and in the logs checked on
  2026-10-08 at most 6 of the 20 closest top priests cast it at the same moment, against
  up to 15 for Apotheosis.

## Develop

```sh
node --test 'test/*.test.js'
```

The core functions run in Node; the browser part only reads Archon's page data
(`/_next/data/<build>/<path>.json`) and adds the panel.
