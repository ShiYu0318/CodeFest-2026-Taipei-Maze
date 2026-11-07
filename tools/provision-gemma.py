#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Provision only Google's pinned Gemma artifact, after the user accepts its terms.
HF_TOKEN is read from the local environment, never printed or persisted.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.request
import urllib.error

REPO = 'litert-community/Gemma3-1B-IT'
REVISION = '42d538a932e8d5b12e6b3b455f5572560bd60b2c'
NAME = 'gemma3-1b-it-int4.litertlm'
SIZE = 584417280
SOURCE = f'https://huggingface.co/{REPO}/resolve/{REVISION}/{NAME}'
RAW = f'https://huggingface.co/{REPO}/raw/{REVISION}/{NAME}'

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, url):
        # HF serves signed URLs via its official CDN. Never forward the account token.
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ''
        if urlparse(url).scheme != 'https' or not (host == 'huggingface.co' or host.endswith('.huggingface.co') or host.endswith('.hf.co')):
            raise ValueError('Unapproved model download redirect; no fallback mirror is allowed.')
        redirected = super().redirect_request(request, fp, code, msg, headers, url)
        if host != 'huggingface.co':
            redirected.remove_header('Authorization')
        return redirected

def open_source(url, token):
    request = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'} if token else {})
    return urllib.request.build_opener(SafeRedirect()).open(request, timeout=60)

def provision(directory, accepted, token):
    if not accepted:
        raise ValueError('Accept Gemma terms in your own HF account first, then pass --accepted-gemma-terms.')
    with open_source(RAW, token) as response:
        pointer = response.read(1024).decode('utf-8')
    match = re.fullmatch(r'version https://git-lfs.github.com/spec/v1\noid sha256:([a-f0-9]{64})\nsize 584417280\n?', pointer)
    if not match:
        raise ValueError('Pinned Google model pointer is invalid; refusing download.')
    expected = match.group(1)
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / NAME
    temporary = directory / (NAME + '.part')
    if target.exists() and target.stat().st_size == SIZE and digest(target) == expected:
        pass
    else:
        checksum, count = hashlib.sha256(), 0
        try:
            with open_source(SOURCE, token) as response, temporary.open('wb') as output:
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > SIZE:
                        raise ValueError('Model exceeded approved size.')
                    checksum.update(chunk)
                    output.write(chunk)
            if count != SIZE or checksum.hexdigest() != expected:
                raise ValueError('Model digest or size did not match the pinned Google artifact.')
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    receipt = {'source': SOURCE, 'sha256': expected, 'size': SIZE, 'license': 'Gemma Terms of Use', 'revision': REVISION}
    (directory / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return target

def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as source:
        while chunk := source.read(1024 * 1024):
            checksum.update(chunk)
    return checksum.hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accepted-gemma-terms', action='store_true')
    parser.add_argument('--simulator', help='Booted iOS simulator UUID; installs to the app private container')
    parser.add_argument('--android', action='store_true', help='Install into a connected debuggable Android app with adb run-as')
    args = parser.parse_args()
    directory = Path(__file__).resolve().parents[1] / '.local' / 'models' / 'gemma3'
    try:
        provision(directory, args.accepted_gemma_terms, os.environ.get('HF_TOKEN'))
        if args.simulator:
            container = subprocess.check_output(['xcrun','simctl','get_app_container',args.simulator,'com.example.townpass','data'], text=True).strip()
            destination = Path(container) / 'Library' / 'Application Support' / 'CodefestAI'
            destination.mkdir(parents=True, exist_ok=True)
            for name in [NAME, 'receipt.json']:
                shutil.copy2(directory / name, destination / name)
        if args.android:
            subprocess.run(['adb','shell','run-as','com.example.townpass','mkdir','-p','files/CodefestAI'], check=True)
            for name in [NAME, 'receipt.json']:
                with (directory / name).open('rb') as source:
                    subprocess.run(['adb','exec-in','run-as','com.example.townpass','sh','-c',f'cat > files/CodefestAI/{name}'], stdin=source, check=True)
        print('Verified Google Gemma 3 artifact provisioned. No credential was saved.')
    except urllib.error.HTTPError as error:
        # Do not expose signed URLs, headers or tokens in exceptions.
        print(f'Official model access failed (HTTP {error.code}). Accept the gated model terms and authenticate locally. No mirror was used.', file=sys.stderr)
        return 1
    except Exception as error:
        print(f'Provisioning stopped: {type(error).__name__}. Verify the license, source, available disk space and device connection.', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
