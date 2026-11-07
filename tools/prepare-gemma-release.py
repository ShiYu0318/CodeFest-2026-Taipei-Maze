#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Team-only release preparation. End users never see a HF token."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DOWNLOAD = 'https://home.yoyo899843.com/models/gemma3-1b-it-int4.litertlm'
spec = importlib.util.spec_from_file_location('provision',ROOT/'tools/provision-gemma.py')
provision = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provision)
NOTICE = 'Gemma is provided under and subject to the Gemma Terms of Use found at ai.google.dev/gemma/terms'

def validate_url(url):
    if url != DOWNLOAD:
        raise ValueError('Only the approved team HTTPS URL is allowed.')
    return url

def metadata(digest):
    if digest != provision.EXPECTED_SHA256:
        raise ValueError('Verified official model hash required.')
    return {'schema':1,'available':False,'source':provision.SOURCE,'revision':provision.REVISION,'size':provision.SIZE,'download_url':DOWNLOAD,'sha256':digest}

def prepare(accepted):
    cache = ROOT/'.local/models/gemma3'
    model = provision.provision(cache,accepted,provision.read_token())
    receipt = json.loads((cache/'receipt.json').read_text())
    if receipt.get('source') != provision.SOURCE or provision.digest(model) != receipt.get('sha256'):
        raise ValueError('Official artifact integrity failed.')
    destination = ROOT/'.local/gemma-release/public'
    destination.mkdir(parents=True,exist_ok=True)
    shutil.copy2(model,destination/provision.NAME)
    shutil.copy2(cache/'receipt.json',destination/'receipt.json')
    for source,target in [('Gemma-Terms.txt','GEMMA_TERMS.txt'),('Gemma-Prohibited-Use-Policy.txt','PROHIBITED_USE_POLICY.txt')]:
        shutil.copy2(ROOT/'integration/townpass/licenses'/source,destination/target)
    (destination/'NOTICE').write_text(NOTICE+'\n')
    for file in destination.iterdir():
        if file.is_file(): file.chmod(0o644)
    result = metadata(receipt['sha256'])
    (ROOT/'integration/townpass/gemma-release.json').write_text(json.dumps(result,indent=2)+'\n')
    return destination

class TeamRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, url):
        from urllib.parse import urlparse
        uri = urlparse(url)
        if uri.scheme != 'https' or uri.hostname != 'home.yoyo899843.com' or uri.port not in (None,443) or uri.username or uri.password:
            raise ValueError('Unapproved release redirect')
        return super().redirect_request(request, fp, code, msg, headers, url)

def open_team(request):
    return urllib.request.build_opener(TeamRedirect(),urllib.request.HTTPSHandler(context=provision.ssl_context())).open(request,timeout=60)

def verify_published(stream, expected_digest, expected_size):
    checksum,count = hashlib.sha256(),0
    while chunk := stream.read(1024*1024):
        count += len(chunk)
        if count > expected_size: raise ValueError('Oversized published model')
        checksum.update(chunk)
    if count != expected_size or checksum.hexdigest() != expected_digest:
        raise ValueError('Published model integrity mismatch')

def activate():
    path = ROOT/'integration/townpass/gemma-release.json'
    value = json.loads(path.read_text())
    expected = metadata(value.get('sha256'))
    validate_url(value.get('download_url'))
    with open_team('https://home.yoyo899843.com/models/receipt.json') as response:
        if response.url != 'https://home.yoyo899843.com/models/receipt.json':
            raise ValueError('Unapproved receipt redirect')
        receipt = json.loads(response.read(4096))
    if receipt.get('source') != provision.SOURCE or receipt.get('sha256') != expected['sha256']:
        raise ValueError('Published receipt mismatch')
    request = urllib.request.Request(DOWNLOAD,method='HEAD')
    with open_team(request) as response:
        if response.url != DOWNLOAD or int(response.headers.get('Content-Length','0')) != provision.SIZE:
            raise ValueError('Published model URL or size mismatch')
    with open_team(DOWNLOAD) as response:
        verify_published(response,expected['sha256'],provision.SIZE)
    expected['available'] = True
    path.write_text(json.dumps(expected,indent=2)+'\n')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accepted-gemma-terms',action='store_true')
    parser.add_argument('--activate',action='store_true',help='After HTTPS publication, verify public receipt/size and enable compiled download manifest')
    args = parser.parse_args()
    try:
        if args.activate:
            activate(); print('HTTPS release verified; rebuild mobile App to enable one-tap download.')
        else:
            prepare(args.accepted_gemma_terms); print('Verified redistribution package prepared under .local/gemma-release/public. Upload it to the server .models directory; HTTPS must be live before activation.')
    except Exception as error:
        print(f'Model release stopped: {type(error).__name__}. Confirm team entitlement, official source, HTTPS publication and receipt integrity. Credentials were not logged.',file=sys.stderr)
        return 1
    return 0
if __name__ == '__main__': sys.exit(main())
