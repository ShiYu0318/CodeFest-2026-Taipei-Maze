#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Fetch the approved private draft package into the origin's static model directory.
Only GITHUB_TOKEN is needed during this deployment; no HF account/token reaches the origin.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import urllib.request
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'yoyo899843/Taipei-Codefest-2026-Big-Dumb'
TAG = 'model-gemma3-1b-it-int4-1325ae366d31'
NAME = 'gemma3-1b-it-int4.litertlm'
SHA = '1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be'
SIZE = 584417280
FILES = {NAME:SIZE,'receipt.json':16384,'GEMMA_TERMS.txt':131072,'PROHIBITED_USE_POLICY.txt':131072,'NOTICE':1024}
spec=importlib.util.spec_from_file_location('provision',ROOT/'tools/provision-gemma.py')
provision=importlib.util.module_from_spec(spec);spec.loader.exec_module(provision)
class AssetRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,request,fp,code,msg,headers,url):
        uri=urlparse(url)
        if uri.scheme!='https' or uri.port not in (None,443) or uri.username or uri.password or not (uri.hostname=='api.github.com' or (uri.hostname or '').endswith('.githubusercontent.com')):
            raise ValueError('Unapproved asset redirect')
        redirected=super().redirect_request(request,fp,code,msg,headers,url)
        if uri.hostname!='api.github.com': redirected.remove_header('Authorization')
        return redirected

def find_release(releases):
    matches=[release for release in releases if isinstance(release,dict) and release.get('tag_name')==TAG]
    if len(matches)!=1: raise ValueError('Approved release not found')
    return matches[0]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination',required=True)
    args=parser.parse_args()
    token=os.environ.get('GH_TOKEN')
    if not token: raise ValueError('Deployment token missing')
    opener=urllib.request.build_opener(AssetRedirect(),urllib.request.HTTPSHandler(context=provision.ssl_context()))
    headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'CodeFest-model-publisher'}
    # The tag endpoint never returns drafts; list releases (drafts need push access).
    request=urllib.request.Request(f'https://api.github.com/repos/{REPOSITORY}/releases?per_page=100',headers=headers)
    with opener.open(request,timeout=60) as response: release=find_release(json.loads(response.read(2097152)))
    assets={asset['name']:asset for asset in release['assets'] if asset['name'] in FILES}
    if set(assets)!=set(FILES): raise ValueError('Incomplete approved release')
    destination=Path(args.destination);destination.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.publish-',dir=destination) as temporary:
        staging=Path(temporary)
        for name,limit in FILES.items():
            asset_id=assets[name]['id']
            if not isinstance(asset_id,int) or asset_id<=0: raise ValueError('Invalid asset')
            request=urllib.request.Request(f'https://api.github.com/repos/{REPOSITORY}/releases/assets/{asset_id}',headers={**headers,'Accept':'application/octet-stream'})
            count=0
            with opener.open(request,timeout=60) as response,(staging/name).open('wb') as output:
                while chunk:=response.read(1024*1024):
                    count+=len(chunk)
                    if count>limit: raise ValueError('Oversized release file')
                    output.write(chunk)
            (staging/name).chmod(0o644)
        if (staging/NAME).stat().st_size!=SIZE or provision.digest(staging/NAME)!=SHA: raise ValueError('Official model integrity failed')
        receipt=json.loads((staging/'receipt.json').read_text())
        if receipt.get('sha256')!=SHA or receipt.get('source')!=provision.SOURCE: raise ValueError('Wrong official receipt')
        for source,name in [('Gemma-Terms.txt','GEMMA_TERMS.txt'),('Gemma-Prohibited-Use-Policy.txt','PROHIBITED_USE_POLICY.txt')]:
            if (staging/name).read_bytes()!=(ROOT/'integration/townpass/licenses'/source).read_bytes(): raise ValueError('Model agreement mismatch')
        if (staging/'NOTICE').read_text().strip()!='Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms': raise ValueError('Wrong Notice')
        # Receipt is promoted last. In-flight downloads retain the old file inode.
        for name in [NAME,'GEMMA_TERMS.txt','PROHIBITED_USE_POLICY.txt','NOTICE','receipt.json']:
            (staging/name).replace(destination/name)
    print('Approved model and agreements published; no credentials were written to the model directory.')
if __name__=='__main__':
    try: main()
    except Exception as error:
        print(f'Model publication stopped: {type(error).__name__}. No unverified files were published; no credentials logged.')
        raise SystemExit(1)
