# SPDX-License-Identifier: AGPL-3.0-or-later
import importlib.util
from pathlib import Path
import tempfile
import io
import hashlib
from urllib.request import Request
import unittest
spec = importlib.util.spec_from_file_location('release',Path(__file__).with_name('prepare-gemma-release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
class ReleaseTests(unittest.TestCase):
    def test_only_user_approved_https_model_url_can_be_published(self):
        for url in ['http://home.yoyo899843.com/models/model','https://mirror.example/model','https://home.yoyo899843.com:8001/models/gemma3-1b-it-int4.litertlm']:
            with self.assertRaises(ValueError): release.validate_url(url)
        self.assertEqual(release.validate_url(release.DOWNLOAD), release.DOWNLOAD)
    def test_metadata_has_no_token_and_hash_is_required(self):
        with self.assertRaises(ValueError): release.metadata('bad')
        data = release.metadata(release.provision.EXPECTED_SHA256)
        self.assertEqual(data['sha256'],release.provision.EXPECTED_SHA256)
        self.assertNotIn('token',str(data).lower())
        self.assertFalse(data['available'])
    def test_publication_must_match_bytes_not_just_receipt_and_length(self):
        expected = hashlib.sha256(b'good').hexdigest()
        release.verify_published(io.BytesIO(b'good'),expected,4)
        for data in [b'evil',b'bad',b'oversized']:
            with self.assertRaises(ValueError): release.verify_published(io.BytesIO(data),expected,4)
    def test_redirect_cannot_leave_approved_https_host(self):
        for url in ['https://mirror.example/model','http://home.yoyo899843.com/model','https://home.yoyo899843.com:8001/model']:
            with self.assertRaises(ValueError): release.TeamRedirect().redirect_request(Request(release.DOWNLOAD),None,302,'Found',{},url)
if __name__ == '__main__': unittest.main()
