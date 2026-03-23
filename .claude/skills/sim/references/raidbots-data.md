# Raidbots Public Data Reference

Raidbots exposes public read-only endpoints for sim reports and static game data. No authentication required.

## Sim Report Results

### GET https://www.raidbots.com/reports/{reportId}/data.json

Fetch the full results of a completed Raidbots simulation. The `reportId` comes from the Raidbots URL: `https://www.raidbots.com/simbot/report/{reportId}`.

**Response:** Full sim result JSON including DPS values, gear comparisons, stat weights, or whatever the sim type produced.

**Notes:**
- Only works for completed simulations
- Reports expire after some time (typically ~30 days)
- Very large reports may be truncated

### Script usage
```bash
./scripts/raidbots.sh report <report-id>
```

---

## Static Game Data

### GET https://www.raidbots.com/static/data/live/{key}.json

Fetch static game data used by Raidbots for item resolution, talent trees, and instance info.

### Available data keys

| Key                    | Description                                              |
|------------------------|----------------------------------------------------------|
| `instances`            | Raid and dungeon instance list with boss encounters      |
| `talents`              | Talent tree data for all specs                           |
| `bonuses`              | Bonus ID mappings (sockets, tertiary, warforged, etc.)   |
| `crafting`             | Crafting recipe and reagent data                         |
| `enchantments`         | Enchantment IDs and stat values                          |
| `equippable-items`     | Full equippable item database with stats                 |
| `item-conversions`     | Item conversion/upgrade paths                            |
| `item-curves`          | Item level scaling curves                                |
| `item-limit-categories`| Unique-equipped and limit category data                  |
| `item-names`           | Lightweight item ID to name mapping                      |
| `item-sets`            | Tier set definitions and bonus info                      |

### Script usage
```bash
./scripts/raidbots.sh static item-names
./scripts/raidbots.sh static instances
./scripts/raidbots.sh static talents
```

### Common use cases

- **Item lookup**: Use `item-names` for quick name resolution, `equippable-items` for full stats
- **Boss/instance info**: Use `instances` to map boss names to encounter data
- **Upgrade paths**: Use `item-curves` and `item-conversions` for ilvl scaling
- **Talent trees**: Use `talents` for current talent tree structure and node IDs
