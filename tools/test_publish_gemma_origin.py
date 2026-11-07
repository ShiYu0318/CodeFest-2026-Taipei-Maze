# SPDX-License-Identifier: AGPL-3.0-or-later
import importlib.util
from pathlib import Path
import unittest
from urllib.request import Request
spec=importlib.util.spec_from_file_location('publisher',Path(__file__).with_name('publish-gemma-origin.py'))
publisher=importlib.util.module_from_spec(spec);spec.loader.exec_module(publisher)
class PublisherTests(unittest.TestCase):
    def test_api_token_does_not_follow_asset_redirect(self):
        request=Request('https://api.github.com/repos/example/assets/1',headers={'Authorization':'Bearer fake-test-token'})
        redirected=publisher.AssetRedirect().redirect_request(request,None,302,'Found',{},'https://release-assets.githubusercontent.com/example/file')
        self.assertIsNone(redirected.get_header('Authorization'))
    def test_insecure_or_foreign_asset_hosts_are_rejected(self):
        for url in ['http://release-assets.githubusercontent.com/file','https://evil.example/file','https://api.github.com.evil.example/file','https://user:secret@api.github.com/file']:
            with self.assertRaises(ValueError): publisher.AssetRedirect().redirect_request(Request('https://api.github.com/asset'),None,302,'Found',{},url)
    def test_draft_release_is_found_by_exact_tag_from_listing(self):
        releases=[{'tag_name':'other','id':1},{'tag_name':publisher.TAG,'draft':True,'id':2}]
        self.assertEqual(publisher.find_release(releases)['id'],2)
        for listing in [[],[{'tag_name':publisher.TAG+'-x'}],[{'tag_name':publisher.TAG},{'tag_name':publisher.TAG}]]:
            with self.assertRaises(ValueError): publisher.find_release(listing)
if __name__=='__main__':unittest.main()
