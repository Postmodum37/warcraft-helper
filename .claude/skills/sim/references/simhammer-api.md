# SimHammer API Reference

Source: [github.com/sortbek/simcraft](https://github.com/sortbek/simcraft)
Inspected: 2026-03-23 (latest commit at time of inspection)

## Overview

SimHammer is a self-hosted SimulationCraft frontend with a **REST API** built on Rust/Actix-web. It accepts SimC addon strings, runs simc as a subprocess, and returns parsed results. All sim jobs are **asynchronous** -- submit returns a job ID, then poll for status/results.

## Base URL

| Mode    | Default URL                  | Port  |
|---------|------------------------------|-------|
| Web     | `http://localhost:8000`      | 8000  |
| Desktop | `http://127.0.0.1:17384`     | 17384 |

Configurable via `PORT` and `BIND_HOST` env vars (web mode) or `NEXT_PUBLIC_API_URL` (frontend).

---

## Simulation Endpoints

### POST /api/sim -- Quick Sim / Stat Weights

Submit a SimC addon string for a quick DPS simulation or stat weights calculation.

**Request:**
```json
{
  "simc_input": "<full SimC addon export string>",
  "sim_type": "quick",
  "iterations": 10000,
  "fight_style": "Patchwerk",
  "target_error": 0.1,
  "desired_targets": 1,
  "max_time": 300,
  "threads": 0,
  "talents": "",
  "max_upgrade": false
}
```

| Field             | Type    | Default       | Notes |
|-------------------|---------|---------------|-------|
| `simc_input`      | string  | **required**  | Full SimC addon export text |
| `sim_type`        | string  | `"quick"`     | `"quick"` for DPS sim, `"stat_weights"` for stat weights |
| `iterations`      | u32     | `1000`        | Frontend sends 10000 |
| `fight_style`     | string  | `"Patchwerk"` | SimC fight style name |
| `target_error`    | f64     | `0.1`         | Target error percentage |
| `desired_targets` | u32     | `1`           | Number of targets |
| `max_time`        | u32     | `300`         | Fight duration in seconds |
| `threads`         | u32     | `0`           | 0 = use all available cores |
| `talents`         | string  | `""`          | Override talents= line (optional) |
| `max_upgrade`     | bool    | `false`       | Sim at max upgrade ilvl |

**Response (202-like, returns immediately):**
```json
{
  "id": "uuid-v4-string",
  "status": "pending",
  "created_at": "2026-03-23T12:00:00Z"
}
```

### POST /api/top-gear/sim -- Top Gear

Find the best gear combination from available items.

**Request:**
```json
{
  "simc_input": "<full SimC addon export string>",
  "selected_items": {
    "trinket1": [0, 1, 2],
    "trinket2": [0, 1],
    "finger1": [0, 1]
  },
  "items_by_slot": {
    "trinket1": [
      {"item_id": 12345, "ilevel": 639, "bonus_ids": [1234], ...},
      {"item_id": 67890, "ilevel": 645, "bonus_ids": [5678], ...}
    ]
  },
  "max_upgrade": false,
  "copy_enchants": true,
  "iterations": 10000,
  "fight_style": "Patchwerk",
  "target_error": 0.1,
  "desired_targets": 1,
  "max_time": 300,
  "threads": 0,
  "talents": ""
}
```

| Field             | Type                              | Notes |
|-------------------|-----------------------------------|-------|
| `simc_input`      | string                            | **required** |
| `selected_items`  | `{slot: [indices]}`               | **required** -- indices into `items_by_slot` arrays |
| `items_by_slot`   | `{slot: [item_objects]}` or null  | If null, parsed from simc_input |
| `copy_enchants`   | bool                              | Copy equipped enchants to alternatives |
| `max_upgrade`     | bool                              | Sim all items at max upgrade level |

**Response:** Same `{id, status, created_at}` as Quick Sim.

### POST /api/droptimizer/sim -- Drop Finder (Droptimizer)

Simulate potential drops to find upgrades.

**Request:**
```json
{
  "simc_input": "<full SimC addon export string>",
  "drop_items": [
    {
      "item_id": 12345,
      "name": "Trinket Name",
      "icon": "inv_icon_name",
      "quality": 4,
      "ilevel": 639,
      "encounter": "Boss Name",
      "inventory_type": 12,
      "bonus_ids": [1234]
    }
  ],
  "iterations": 10000,
  "fight_style": "Patchwerk",
  "target_error": 0.1,
  "desired_targets": 1,
  "max_time": 300,
  "threads": 0,
  "talents": ""
}
```

| Field         | Type             | Notes |
|---------------|------------------|-------|
| `simc_input`  | string           | **required** |
| `drop_items`  | array of objects | **required** -- items to compare against equipped gear |

**Response:** Same `{id, status, created_at}` as Quick Sim.

---

## Job Status / Results

### GET /api/sim/{id} -- Poll Job Status

Poll for simulation progress and results. Frontend polls every 2 seconds.

**Response (running):**
```json
{
  "id": "uuid",
  "status": "running",
  "progress": 45,
  "progress_stage": "Stage 2 of 3",
  "progress_detail": "120/300 profilesets",
  "stages_completed": ["Low - 300 combos", "Medium - kept 50"],
  "result": null,
  "error": null
}
```

**Response (done -- Quick Sim):**
```json
{
  "id": "uuid",
  "status": "done",
  "progress": 100,
  "progress_stage": null,
  "progress_detail": null,
  "stages_completed": [],
  "result": {
    "player_name": "Charactername",
    "player_class": "Frost_Mage",
    "dps": 1234567.8,
    "dps_error": 1234.5,
    "fight_length": 300.0,
    "simc_version": "SimC 1120-01 / thewarwithin / abc1234 / 2026-01-15",
    "abilities": [
      {"name": "frostbolt", "portion_dps": 234567.8, "school": "frost"},
      {"name": "ice_lance", "portion_dps": 198765.4, "school": "frost"}
    ],
    "stat_weights": {
      "intellect": 1.0,
      "haste": 0.85,
      "mastery": 0.72,
      "crit": 0.68,
      "vers": 0.65
    }
  },
  "error": null
}
```

Notes on `result` fields:
- `stat_weights` is only present when `sim_type` was `"stat_weights"`
- `abilities` is sorted by `portion_dps` descending

**Response (done -- Top Gear / Droptimizer):**
```json
{
  "id": "uuid",
  "status": "done",
  "progress": 100,
  "result": {
    "type": "top_gear",
    "base_dps": 1200000.0,
    "player_name": "Charactername",
    "player_class": "Frost_Mage",
    "simc_version": "SimC 1120-01 / ...",
    "results": [
      {
        "name": "Combo 1",
        "items": [
          {"slot": "trinket1", "item_id": 12345, "ilevel": 639, "name": "Trinket A", "bonus_ids": [1234]},
          {"slot": "trinket2", "item_id": 67890, "ilevel": 645, "name": "Trinket B", "bonus_ids": [5678]}
        ],
        "dps": 1250000.0,
        "delta": 50000.0
      },
      {
        "name": "Currently Equipped",
        "items": [...],
        "dps": 1200000.0,
        "delta": 0
      }
    ],
    "equipped_gear": {
      "head": {"slot": "head", "item_id": 111, "ilevel": 639, "name": "Helm", ...},
      "neck": {...},
      ...
    }
  },
  "error": null
}
```

Notes on Top Gear results:
- `results` array is sorted by DPS descending
- `delta` is DPS difference from base (Currently Equipped)
- `equipped_gear` contains all 16 gear slots with item details

**Response (failed):**
```json
{
  "id": "uuid",
  "status": "failed",
  "progress": 0,
  "result": null,
  "error": "simc failed (exit 1): Error message from simc stderr"
}
```

**Status values:** `"pending"` | `"running"` | `"done"` | `"failed"`

### GET /api/sim/{id}/raw -- Raw Result JSON

Returns just the parsed result JSON (no wrapper), or 404 if not ready.

---

## Game Data Endpoints

### GET /api/item-info/{item_id}

Get item metadata from local game data.

**Query params:** `?bonus_ids=1234,5678` (comma-separated, optional)

**Response:**
```json
{
  "item_id": 12345,
  "name": "Item Name",
  "quality": 4,
  "quality_name": "epic",
  "icon": "inv_icon_name",
  "ilevel": 639
}
```

### POST /api/item-info/batch

Get info for multiple items at once (max 100).

**Request:**
```json
{
  "items": [
    {"item_id": 12345, "bonus_ids": [1234, 5678]},
    {"item_id": 67890}
  ]
}
```

Or alternatively: `{"item_ids": [12345, 67890]}`

**Response:** `{"12345": {...item_info...}, "67890": {...item_info...}}`

### GET /api/enchant-info/{enchant_id}

**Response:** `{"enchant_id": 12345, "name": "Enchant Name"}`

### GET /api/gem-info/{gem_id}

**Response:** `{"gem_id": 12345, "name": "Gem Name", "icon": "inv_icon", "quality": 3}`

### POST /api/max-upgrade-ilevels

Get max-upgrade item levels for items (max 200).

**Request:** Array of `{"item_id": N, "bonus_ids": [...]}`

**Response:** `{"12345:1234,5678": 678}` (key = `item_id:sorted_bonus_ids`, value = max ilvl)

### GET /api/upgrade-options

**Query params:** `?bonus_ids=1234,5678`

**Response:** `{"options": [...]}`

---

## Instance / Drop Data Endpoints

### GET /api/instances

List all raid and dungeon instances.

**Response:**
```json
[
  {
    "id": 1234,
    "name": "Liberation of Undermine",
    "type": "raid",
    "order": 1,
    "encounters": [
      {"id": 1, "name": "Boss Name"}
    ]
  },
  {
    "id": -1,
    "name": "Mythic+ Season",
    "type": "dungeon",
    "encounters": [{"id": 5678, "name": "Dungeon Name"}]
  }
]
```

Special IDs: `-1` = M+ dungeon pool, `-32` = normal dungeon pool.

### GET /api/instances/type/{type}/drops

Get all drops for an instance type.

**Path params:** `type` = `"raid"` | `"dungeon"`
**Query params:** `?class_name=mage&spec=frost` (optional, filters for equippable items)

**Response:** `{"slot_name": [drop_items...], ...}` grouped by gear slot.

### GET /api/instances/{id}/drops

Get drops for a specific instance.

**Query params:** `?class_name=mage&spec=frost` (optional)

**Response:** Same slot-grouped format as above.

---

## Utility Endpoints

### GET /health

**Response:**
```json
{
  "status": "ok",
  "threads": 8,
  "mode": "desktop"
}
```

### GET /api/system-stats (desktop only)

**Response:** `{"cpu_usage": 45.2}`

---

## Async Job Lifecycle

```
POST /api/sim          -->  {id, status: "pending"}
                             |
                             v
GET /api/sim/{id}      -->  {status: "running", progress: 45, ...}
  (poll every 2s)            |
                             v
GET /api/sim/{id}      -->  {status: "done", progress: 100, result: {...}}
```

For Top Gear with many combos (>= 10), the backend runs a **3-stage elimination sim**:
1. **Low precision** (target_error=1.0) -- eliminate bottom 50%
2. **Medium precision** (target_error=0.2) -- eliminate bottom 70% of remaining
3. **High precision** (target_error=0.05) -- final ranking of survivors

Progress reporting includes stage info and profileset completion counts.

---

## Scripting with curl

### Quick Sim
```bash
# Submit
JOB=$(curl -s http://localhost:8000/api/sim \
  -H 'Content-Type: application/json' \
  -d "{\"simc_input\": \"$(cat profile.simc)\", \"sim_type\": \"quick\", \"iterations\": 10000, \"target_error\": 0.1}" \
  | jq -r '.id')

# Poll until done
while true; do
  RESULT=$(curl -s "http://localhost:8000/api/sim/$JOB")
  STATUS=$(echo "$RESULT" | jq -r '.status')
  [ "$STATUS" = "done" ] || [ "$STATUS" = "failed" ] && break
  sleep 2
done

# Extract DPS
echo "$RESULT" | jq '.result.dps'
```

### Stat Weights
```bash
curl -s http://localhost:8000/api/sim \
  -H 'Content-Type: application/json' \
  -d "{\"simc_input\": \"$(cat profile.simc)\", \"sim_type\": \"stat_weights\", \"iterations\": 10000}"
```

---

## Requirements for Self-Hosting

- Docker (recommended) or Rust toolchain + SimulationCraft binary
- SimC binary path configured via `SIMC_PATH` env var (default: `/usr/local/bin/simc`)
- Game data JSON files in `DATA_DIR` (default: `./resources/data`)
- No external API keys needed -- all game data is local

## Suitability for CLI Scripting

The SimHammer API is **fully REST-based** and well-suited for CLI scripting:
- Standard JSON request/response over HTTP
- No WebSockets required (polling only)
- No authentication or API keys
- Stateless requests (each sim is independent)
- Simple async model: submit -> poll -> read result
- All three sim types (quick, top gear, droptimizer) use the same pattern
