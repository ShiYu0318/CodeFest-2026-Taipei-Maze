"""Download only manifest-listed, redistribution-reviewed official research CSVs."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import urllib.error
import urllib.request

REPO = Path(__file__).resolve().parents[2]


def fetch(url):
    if not url.startswith("https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid="):
        raise ValueError("URL is not an allowlisted official data endpoint")
    request = urllib.request.Request(url, headers={"User-Agent": "TaipeiMaze-DataResearch/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            content = response.read(2_000_001)
    except urllib.error.URLError as exc:
        if "CERTIFICATE_VERIFY_FAILED" not in str(exc):
            raise
        # Windows Schannel retains HTTPS certificate verification; never use --insecure.
        result = subprocess.run(["curl.exe", "--silent", "--show-error", "--fail", "--location", "--max-time", "30", url],
                                capture_output=True, timeout=35, check=True)
        content = result.stdout
    if len(content) > 2_000_000 or content.lstrip().lower().startswith((b"<!doctype html", b"<html")):
        raise ValueError("Unexpected response size or HTML instead of CSV")
    return content


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Explicitly enable public HTTPS requests; default only lists sources")
    args = parser.parse_args()
    manifest = json.loads((REPO / "data/manifest.json").read_text(encoding="utf-8"))
    for item in manifest["datasets"]:
        target = REPO / "data" / item["path"]
        if target.parent.resolve() != (REPO / "data/raw").resolve():
            raise ValueError("Invalid raw path")
        if not args.download:
            print(item["id"], item["path"], item["download_url"])
            continue
        if item["repository_copy_review"] != "approved":
            raise ValueError("Source is not approved for a research copy")
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest() != item["sha256"]:
                raise ValueError(f"Existing file differs: {target.name}; not overwriting")
            print(item["id"], "already present")
            continue
        content = fetch(item["download_url"])
        if hashlib.sha256(content).hexdigest() != item["sha256"]:
            raise ValueError(f"Official source changed: {item['id']}; review a new snapshot rather than silently replacing this version")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        print(item["id"], "downloaded and hash verified")
