#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pack built web assets for the TownPass loopback-only asset server."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
dist = root / 'app' / 'dist'
destination = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'TownPass' / 'assets' / 'codefest_web.bundle'
files = {}
for path in sorted(dist.rglob('*')):
    if not path.is_file() or path.suffix == '.map':
        continue
    content = path.read_bytes()
    files['/' + path.relative_to(dist).as_posix()] = {'sha256': hashlib.sha256(content).hexdigest(), 'data': base64.b64encode(content).decode('ascii')}
if '/index.html' not in files:
    raise SystemExit('Build app first; no index.html found.')
revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
payload = json.dumps({'schema':1,'revision':revision,'files':files},separators=(',',':')).encode()
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_bytes(gzip.compress(payload,mtime=0))
print(f'Bundled {len(files)} local web files ({destination.stat().st_size} bytes). Model weights excluded.')

# Model metadata and complete terms ship with the App, never an account token.
release = json.loads((root / 'integration/townpass/gemma-release.json').read_text())
license_dir = root / 'integration/townpass/licenses'
release['agreement'] = (license_dir / 'Gemma-Terms.txt').read_text()
release['policy'] = (license_dir / 'Gemma-Prohibited-Use-Policy.txt').read_text()
release['notice'] = 'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms'
(destination.parent / 'gemma_release.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
