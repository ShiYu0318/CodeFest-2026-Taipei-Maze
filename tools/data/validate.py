"""Read-only checks for the committed research snapshot and its generated subsets."""
from pathlib import Path
import csv
import hashlib
import json
import re

from prepare import read_csv, select

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"


def main():
    manifest = json.loads((DATA / "manifest.json").read_text(encoding="utf-8"))
    for item in manifest["datasets"]:
        path = DATA / item["path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], path
        encoding, fields, rows = read_csv(path)
        subset = [row for row in rows if select(row, path.name == "taipei_toilets.csv")]
        record = json.loads((DATA / "processed" / (path.stem + "_taipei_subset.json")).read_text(encoding="utf-8"))
        assert record["source_id"] == item["id"]
        assert record["source_encoding"] == encoding
        assert [r["fields"] for r in record["records"]] == subset, path
        for suffix, expected in (("_utf8.csv", rows), ("_taipei_subset.csv", subset)):
            with (DATA / "processed" / (path.stem + suffix)).open(encoding="utf-8-sig", newline="") as stream:
                reader = csv.DictReader(stream)
                assert reader.fieldnames == fields
                assert list(reader) == expected, path
    for path in DATA.rglob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))
    for name in ("README.md", "SOURCE_CATALOG.md", "ATTRIBUTION.md", "maps/README.md"):
        path = DATA / name
        for target in re.findall(r"\]\(([^)]+)\)", path.read_text(encoding="utf-8")):
            if not target.startswith(("https://", "http://", "#", "mailto:")):
                assert (path.parent / target.split("#", 1)[0]).exists(), (name, target)
    geo = json.loads((DATA / "processed/official_candidate_points.geojson").read_text(encoding="utf-8"))
    assert geo["type"] == "FeatureCollection"
    assert all(feature["geometry"]["type"] == "Point" for feature in geo["features"])
    assert all(row["release_approved"] is False for row in json.loads((DATA / "sources.json").read_text(encoding="utf-8")))
    print(f"PASS: {len(manifest['datasets'])} raw hashes, CSV/JSON subset equivalence, local document links, and {len(geo['features'])} candidate points.")


if __name__ == "__main__":
    main()
