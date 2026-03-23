# Raider.IO API Endpoints

Base URL: `https://raider.io/api/v1`

All endpoints are GET requests. No authentication required.

---

## 1. GET /characters/profile

Fetch a character's Mythic+ scores, run history, gear, guild, and raid progression.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `region`  | Yes      | `us`, `eu`, `kr`, `tw`, `cn` |
| `realm`   | Yes      | Realm slug (lowercase, hyphenated, e.g. `illidan`, `area-52`, `tarren-mill`) |
| `name`    | Yes      | Character name (case-insensitive) |
| `fields`  | No       | Comma-separated list of extra data fields (see below) |

**Available fields:**

| Field | Description |
|-------|-------------|
| `mythic_plus_scores_by_season:current` | Current season M+ score (overall + per-role) |
| `mythic_plus_best_runs` | Best timed run per dungeon |
| `mythic_plus_recent_runs` | Most recent M+ runs |
| `mythic_plus_highest_level_runs` | Highest key level completed per dungeon (timed or not) |
| `mythic_plus_weekly_highest_level_runs` | Highest runs this reset |
| `mythic_plus_previous_weekly_highest_level_runs` | Highest runs last reset |
| `mythic_plus_ranks` | Score ranking (world, region, realm, class, spec) |
| `previous_mythic_plus_ranks` | Rankings from previous season |
| `gear` | Equipped gear with item level |
| `guild` | Guild name and realm |
| `raid_progression` | Raid progression summary (e.g. `9/9 H`) |

Multiple fields are comma-separated (no spaces).

**Example:**

```bash
rio.sh characters/profile \
  region=us realm=illidan name=Toon \
  fields=mythic_plus_scores_by_season:current,mythic_plus_best_runs,mythic_plus_ranks,gear
```

**Notes:**
- This is the most commonly used endpoint. Almost every M+ question starts here.
- If a character has no M+ data for the current season, score fields return zeroes.
- `mythic_plus_best_runs` returns one entry per dungeon (the best timed run). Use `mythic_plus_highest_level_runs` to see untimed runs too.
- Combine multiple fields in one call to minimize requests.

---

## 2. GET /guilds/profile

Fetch guild information, roster, and raid progression.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `region`  | Yes      | `us`, `eu`, `kr`, `tw`, `cn` |
| `realm`   | Yes      | Realm slug |
| `name`    | Yes      | Guild name (URL-encoded if spaces, e.g. `Blood+Legion` or `Blood%20Legion`) |
| `fields`  | No       | Comma-separated: `members`, `raid_rankings`, `raid_progression` |

**Example:**

```bash
rio.sh guilds/profile \
  region=us realm=illidan name=Blood+Legion \
  fields=members,raid_progression,raid_rankings
```

**Notes:**
- `members` returns the full roster with each member's M+ score and class.
- `raid_rankings` returns the guild's raid ranking per difficulty.
- `raid_progression` returns boss kill counts per difficulty (e.g. `9/9 H`).
- Guild names with spaces: use `+` or `%20` in the name parameter.

---

## 3. GET /mythic-plus/runs

Browse M+ leaderboard runs with filters.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `season`  | Yes      | Season slug (e.g. `season-mn-1`) |
| `region`  | Yes      | `us`, `eu`, `kr`, `tw`, `cn`, or `world` |
| `dungeon` | Yes      | Dungeon slug (e.g. `algethar-academy`) or `all` |
| `affixes` | Yes      | Affix slug (e.g. `fortified-tyrannical`) or `all` |
| `page`    | Yes      | 0-indexed page number |

**Example:**

```bash
rio.sh mythic-plus/runs \
  season=season-mn-1 region=us dungeon=all affixes=all page=0
```

```bash
rio.sh mythic-plus/runs \
  season=season-mn-1 region=world dungeon=skyreach affixes=all page=0
```

**Notes:**
- Returns 20 runs per page, sorted by key level (descending) then time.
- Use `dungeon=all` to see top runs across all dungeons.
- Use `affixes=all` unless you want a specific affix combination.
- The `page` parameter is 0-indexed: page 0 is the top runs.
- Each run includes group composition (names, classes, specs), key level, time, and whether it was timed.

---

## 4. GET /mythic-plus/affixes

Get the current weekly M+ affix rotation.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `region`  | Yes      | `us`, `eu`, `kr`, `tw`, `cn` |
| `locale`  | No       | Language code (default: `en`) |

**Example:**

```bash
rio.sh mythic-plus/affixes region=us
```

**Notes:**
- Returns the active affixes for the current reset.
- Each affix includes `id`, `name`, `description`, and icon URLs.
- The `title` field is a combined string of all active affixes.
- Useful for answering "what are this week's affixes?" questions.

---

## 5. GET /mythic-plus/static-data

Get M+ season metadata: season slugs, dungeon pool, and timer info.

| Parameter      | Required | Description |
|----------------|----------|-------------|
| `expansion_id` | Yes      | Raider.IO expansion ID (e.g. `11` for Midnight) |

**Example:**

```bash
rio.sh mythic-plus/static-data expansion_id=11
```

**Notes:**
- Returns all M+ seasons for the expansion, with dungeon lists.
- Each dungeon includes `slug`, `name`, `short_name`, `keystone_timer_seconds`, and `challenge_mode_id`.
- The `is_main_season` flag indicates the currently active season.
- Raider.IO expansion IDs differ from WarcraftLogs expansion IDs. See `schema.md` for the mapping.

---

## 6. GET /mythic-plus/season-cutoffs

Get score percentile cutoffs and achievement thresholds for a season.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `season`  | Yes      | Season slug (e.g. `season-mn-1`) |
| `region`  | Yes      | `us`, `eu`, `kr`, `tw`, `cn` |

**Example:**

```bash
rio.sh mythic-plus/season-cutoffs season=season-mn-1 region=us
```

**Notes:**
- Returns percentile cutoffs: `p999` (top 0.1%), `p990` (top 1%), `p900` (top 10%), `p750` (top 25%), `p600` (top 40%).
- Each percentile has `quantileMinValue` (the score threshold), `quantilePopulationCount`, and `totalPopulationCount`.
- Also returns achievement score thresholds with population counts:
  - `keystoneLegend` (3000 score)
  - `keystoneHero` (2500)
  - `keystoneMaster` (2000)
  - `keystoneConqueror` (1500)
  - `keystoneExplorer` (1000)
- Returns `allTimed{N}` entries showing the score for timing all 8 dungeons at key level N.
- Early in a season, cutoff values may be 0 until enough data is collected.

---

## 7. GET /mythic-plus/score-tiers

Get the score-to-color mapping for a season.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `season`  | Yes      | Season slug (e.g. `season-mn-1`) |

**Example:**

```bash
rio.sh mythic-plus/score-tiers season=season-mn-1
```

**Notes:**
- Returns an array of `{score, rgbHex, rgbInteger, rgbFloat}` objects, sorted high to low.
- The color is a continuous gradient, not discrete tiers. Use `rgbHex` for display.
- Broad color ranges (based on TWW Season 3 as reference):
  - Orange (`#ff8000`): top scores (~4300+)
  - Orange-to-pink transition: ~3800-4300
  - Pink/purple: ~3000-3800
  - Blue: ~2500-3000
  - Blue-to-green transition: ~2000-2500
  - Green: ~1500-2000
  - Light green to white: below ~1500
- Early in a season, scores may be `null` until data populates.
- Score thresholds shift each season based on dungeon pool and scaling.

---

## 8. GET /raiding/raid-rankings

Get guild raid rankings (progression-based leaderboard).

| Parameter    | Required | Description |
|--------------|----------|-------------|
| `raid`       | Yes      | Raid slug (e.g. `vsldr-mqd`) |
| `difficulty` | Yes      | `normal`, `heroic`, or `mythic` |
| `region`     | Yes      | `us`, `eu`, `kr`, `tw`, `cn`, or `world` |
| `realm`      | No       | Realm slug (filter to a specific server) |
| `page`       | No       | 0-indexed page number (default: 0) |

**Example:**

```bash
rio.sh raiding/raid-rankings \
  raid=vsldr-mqd difficulty=mythic region=world page=0
```

```bash
rio.sh raiding/raid-rankings \
  raid=vsldr-mqd difficulty=heroic region=us realm=illidan page=0
```

**Notes:**
- Returns 20 guilds per page, ranked by progression then kill speed.
- Each entry includes guild name, realm, region, progression summary, and ranking.
- Use `region=world` for global rankings.
- Add `realm` to filter to a specific server's leaderboard.
- Raid slugs can be discovered via Raider.IO URLs or by checking the `raid_progression` field on a guild profile.
