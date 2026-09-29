"""Turn the Overture building export into the 3D layer the map loads.

Overture has no heights for Mullana, so height is estimated from footprint
area, then replaced by floor counts from scripts/height_overrides.json
(buildings checked on foot).

Usage: python3 scripts/buildings.py <overture_export.geojson>
Writes public/buildings.geojson.
"""
import json
import sys
from pathlib import Path

FLOOR_M = 3.2
OVERRIDES = Path(__file__).with_name("height_overrides.json")


def floors_from_area(area):
    # ponytail: area heuristic, replace with walked floor counts as they arrive
    if area < 120:
        return 1
    if area < 400:
        return 2
    if area < 1500:
        return 3
    return 4


def main(src):
    data = json.load(open(src))
    overrides = json.load(open(OVERRIDES)) if OVERRIDES.exists() else {}
    out = []
    for f in data["features"]:
        p = f["properties"]
        floors = overrides.get(p["id"]) or floors_from_area(p["area"])
        ring = [[round(x, 6), round(y, 6)] for x, y in f["geometry"]["coordinates"][0]]
        out.append({
            "type": "Feature",
            "properties": {"h": round(floors * FLOOR_M, 1)},
            "geometry": {"type": "Polygon", "coordinates": [ring]},
        })
    dest = Path(__file__).parent.parent / "public" / "buildings.geojson"
    json.dump({"type": "FeatureCollection", "features": out}, open(dest, "w"), separators=(",", ":"))
    print(f"{len(out)} buildings -> {dest} ({dest.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    assert floors_from_area(50) == 1 and floors_from_area(2000) == 4
    main(sys.argv[1])
