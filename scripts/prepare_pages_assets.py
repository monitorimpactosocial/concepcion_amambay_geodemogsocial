#!/usr/bin/env python3
"""Prepare GitHub Pages assets after Vite build.

GitHub Pages serves the built `dist` branch, not Git LFS objects. The workflow
checks out LFS files before build, then this script keeps published assets under
practical Pages limits by simplifying the two very large land-use layers.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


MAX_BYTES = 95 * 1024 * 1024
LAND_USE_FILES = {
    "uso_de_suelo_concepcion.geojson": 32,
    "uso_de_suelo_amambay.geojson": 28,
}
PROPERTY_ALLOWLIST = {
    "DESC_USO",
    "desc_uso",
    "DPTO",
    "dpto",
    "DPTO_DESC",
    "dpto_desc",
    "DISTRITO",
    "distrito",
    "DIST_DESC",
    "dist_desc",
}


def is_lfs_pointer(path: Path) -> bool:
    if path.stat().st_size > 1024:
        return False
    try:
        return path.read_text(encoding="utf-8", errors="ignore").startswith(
            "version https://git-lfs.github.com/spec/v1"
        )
    except OSError:
        return False


def round_coord(value: Any) -> Any:
    if isinstance(value, float):
        return round(value, 5)
    return value


def thin_ring(ring: list[Any], stride: int) -> list[Any]:
    if len(ring) <= 8 or stride <= 1:
        return [[round_coord(v) for v in point] if isinstance(point, list) else point for point in ring]

    thinned = ring[::stride]
    if ring[-1] != thinned[-1]:
        thinned.append(ring[-1])

    if len(thinned) < 4:
        thinned = ring[:4]

    if thinned[0] != thinned[-1]:
        thinned.append(thinned[0])

    return [[round_coord(v) for v in point] if isinstance(point, list) else point for point in thinned]


def simplify_coords(coords: Any, geom_type: str, stride: int, depth: int = 0) -> Any:
    if not isinstance(coords, list):
        return coords

    if geom_type == "LineString" or (geom_type == "MultiPoint" and depth == 0):
        return thin_ring(coords, stride)

    if geom_type == "Polygon" and depth == 0:
        return [thin_ring(ring, stride) for ring in coords if isinstance(ring, list)]

    if geom_type == "MultiPolygon" and depth == 0:
        return [
            [thin_ring(ring, stride) for ring in polygon if isinstance(ring, list)]
            for polygon in coords
            if isinstance(polygon, list)
        ]

    return [simplify_coords(item, geom_type, stride, depth + 1) for item in coords]


def simplify_feature(feature: dict[str, Any], stride: int) -> dict[str, Any]:
    geometry = feature.get("geometry") or {}
    geom_type = str(geometry.get("type") or "")
    properties = feature.get("properties") or {}
    kept_properties = {
        key: value for key, value in properties.items() if key in PROPERTY_ALLOWLIST
    }

    return {
        "type": "Feature",
        "properties": kept_properties,
        "geometry": {
            "type": geom_type,
            "coordinates": simplify_coords(geometry.get("coordinates"), geom_type, stride),
        },
    }


def simplify_geojson(path: Path, stride: int) -> None:
    if not path.exists():
        return
    if path.stat().st_size <= MAX_BYTES:
        return

    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if payload.get("type") != "FeatureCollection":
        raise SystemExit(f"{path.name} is not a FeatureCollection")

    features = payload.get("features")
    if not isinstance(features, list):
        raise SystemExit(f"{path.name} has no features list")

    simplified = {
        "type": "FeatureCollection",
        "features": [simplify_feature(feature, stride) for feature in features if isinstance(feature, dict)],
    }

    path.write_text(
        json.dumps(simplified, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    if path.stat().st_size > MAX_BYTES:
        raise SystemExit(
            f"{path.name} is still too large for Pages: {path.stat().st_size / 1024 / 1024:.1f} MB"
        )


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: prepare_pages_assets.py <dist-dir>")

    dist_dir = Path(sys.argv[1]).resolve()
    if not dist_dir.is_dir():
        raise SystemExit(f"dist directory not found: {dist_dir}")

    for name, stride in LAND_USE_FILES.items():
        simplify_geojson(dist_dir / name, stride)

    (dist_dir / ".gitattributes").write_text(
        "*.geojson -filter -diff -merge text\n"
        "*.json -filter -diff -merge text\n",
        encoding="utf-8",
    )

    bad_pointers = [
        path.relative_to(dist_dir).as_posix()
        for path in dist_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in {".geojson", ".json"} and is_lfs_pointer(path)
    ]
    if bad_pointers:
        raise SystemExit("LFS pointer files remain in dist: " + ", ".join(bad_pointers))

    oversized = [
        f"{path.relative_to(dist_dir).as_posix()} ({path.stat().st_size / 1024 / 1024:.1f} MB)"
        for path in dist_dir.rglob("*")
        if path.is_file() and path.stat().st_size > MAX_BYTES
    ]
    if oversized:
        raise SystemExit("Files exceed Pages asset limit: " + ", ".join(oversized))

    print("Pages assets ready: no LFS pointers and no oversized files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
