#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Generate local printable testing codes; these are NOT installed station tags."""
import html
import json
from pathlib import Path
import subprocess
import qrcode
import qrcode.image.svg
import zipfile
root = Path(__file__).resolve().parents[1]
script = '''import fs from 'node:fs'; import {stationPoints,stationQrPayload} from './app/src/station/scan.mjs'; const data=JSON.parse(fs.readFileSync('app/src/views/station-points.json','utf8')); process.stdout.write(JSON.stringify(stationPoints(data).map(p=>({id:p.id,floor:p.floor,name:p.name,payload:stationQrPayload(p.id,data)}))));'''
catalog = json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root,text=True))
destination = root / '.local' / 'station-qr'
destination.mkdir(parents=True,exist_ok=True)
cards = []
for point in catalog:
    # IDs are local versioned data; never use payload-provided paths.
    name = point['id']
    if not all(c.isascii() and (c.isalnum() or c in '-_') for c in name):
        raise ValueError('Unsafe station point ID')
    image = qrcode.make(point['payload'],image_factory=qrcode.image.svg.SvgPathImage,box_size=4,border=4)
    image.save(destination / (name + '.svg'))
    cards.append(f'<article><h2>{html.escape(point["floor"])} · {html.escape(point["name"])}</h2><img src="{name}.svg" alt="測試定位碼"><p>{html.escape(name)}</p><a href="{name}.svg" download="{name}.svg">下載此定位碼 SVG</a></article>')
(destination / 'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
(destination / 'index.html').write_text('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>車站定位碼測試表</title><style>body{font:16px/1.5 system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{border:1px solid #aaa;padding:16px;break-inside:avoid}h2{font-size:18px}img{width:240px;max-width:100%}@media print{main{grid-template-columns:1fr 1fr}}</style><h1>測試定位碼，尚未現地布設</h1><p>請在台北通 App 的地圖按「掃描定位」，用真機掃描這張表。掃碼成功後自動切換樓層、置中並顯示「您在這裡」，再選目的地。只有自己的測試碼能確認對應設施，並不證明人真的位於車站，也不是現場合法設置的導航標籤。</p><p><a href="station-qr.zip" download>下載全部定位碼 ZIP</a> · <a href="catalog.json" download>下載點位與 QR 內容對照 JSON</a></p><main>'''+''.join(cards)+'</main></html>')
with zipfile.ZipFile(destination / 'station-qr.zip', 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for filename in ['index.html', 'catalog.json', *[point['id'] + '.svg' for point in catalog]]:
        archive.write(destination / filename, arcname=filename)
print(f'Generated {len(catalog)} test SVG codes, index.html and station-qr.zip in {destination}')
