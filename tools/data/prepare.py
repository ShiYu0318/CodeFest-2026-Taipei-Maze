"""Reproduce research CSV subsets using only the Python standard library."""
from pathlib import Path
import argparse
import csv
import hashlib
import io
import json

REPO = Path(__file__).resolve().parents[2]
BBOX = [121.510, 25.043, 121.522, 25.051]  # west, south, east, north


def read_csv(path):
    for encoding in ("utf-8-sig", "cp950", "utf-16"):
        try:
            text = path.read_bytes().decode(encoding)
            break
        except UnicodeError:
            continue
    else:
        raise ValueError(f"Unknown CSV encoding: {path.name}")
    reader = csv.DictReader(io.StringIO(text))
    fields = [key.strip() for key in reader.fieldnames or [] if key and key.strip()]
    if len(fields) != len(set(fields)):
        raise ValueError(f"Duplicate normalized columns: {path.name}")
    rows = [{key.strip(): value for key, value in row.items() if key and key.strip()} for row in reader]
    return encoding, fields, rows


def coordinates(row):
    try:
        lon, lat = float(row["經度"]), float(row["緯度"])
        if -180 <= lon <= 180 and -90 <= lat <= 90:
            return [lon, lat]
    except (KeyError, ValueError, TypeError):
        pass
    return None


def select(row, toilets=False):
    station = any("台北車站" in str(v) or "臺北車站" in str(v) or str(v).strip() in ("台北", "臺北") for v in row.values())
    point = coordinates(row)
    nearby = toilets and point and BBOX[0] <= point[0] <= BBOX[2] and BBOX[1] <= point[1] <= BBOX[3]
    return bool(station or nearby)


def prepare(data_dir, output):
    manifest = json.loads((data_dir / "manifest.json").read_text(encoding="utf-8"))
    output.mkdir(parents=True, exist_ok=True)
    summary, features = [], []

    def dump(name, obj):
        (output / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for source in manifest["datasets"]:
        path = data_dir / source["path"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"Raw source hash mismatch: {path.name}; review the new snapshot before updating the manifest")
        encoding, fields, rows = read_csv(path)
        selected = [(i + 2, row) for i, row in enumerate(rows) if select(row, path.name == "taipei_toilets.csv")]
        dump(path.stem + "_taipei_subset.json", {
            "source_id": source["id"], "source_file": source["path"], "source_encoding": encoding,
            "filter": "station-name match; toilets additionally use bbox" if path.name == "taipei_toilets.csv" else "station-name match",
            "bbox_wsen": BBOX if path.name == "taipei_toilets.csv" else None,
            "verification_status": "desk_checked", "release_approved": False,
            "records": [{"source_record": i, "fields": row} for i, row in selected],
        })
        for suffix, records in (("_utf8.csv", rows), ("_taipei_subset.csv", [row for _, row in selected])):
            with (output / (path.stem + suffix)).open("w", encoding="utf-8-sig", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=fields)
                writer.writeheader()
                writer.writerows(records)
        summary.append({"source_id": source["id"], "file": path.name, "encoding": encoding,
                        "total_records": len(rows), "subset_records": len(selected), "fields": fields})
        for record, row in selected:
            point = coordinates(row)
            if point:
                features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": point},
                                 "properties": {"source_id": source["id"], "source_file": path.name,
                                                "source_record": record, "verification_status": "desk_checked",
                                                "release_approved": False, **row}})
    dump("csv_summary.json", summary)
    dump("official_candidate_points.geojson", {"type": "FeatureCollection", "features": features})
    print(f"Prepared {len(summary)} datasets and {len(features)} candidate points; no graph or field verification inferred.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=REPO / "data")
    parser.add_argument("--output", type=Path, help="Defaults to data/processed; overwrites only named generated outputs")
    args = parser.parse_args()
    prepare(args.data_dir, args.output or args.data_dir / "processed")
