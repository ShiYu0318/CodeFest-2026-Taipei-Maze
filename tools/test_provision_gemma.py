# SPDX-License-Identifier: AGPL-3.0-or-later
import importlib.util
from pathlib import Path
import tempfile
import unittest
from urllib.request import Request

spec = importlib.util.spec_from_file_location('provision', Path(__file__).with_name('provision-gemma.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ProvisionTests(unittest.TestCase):
    def test_terms_gate_precedes_network_or_directory_creation(self):
        with tempfile.TemporaryDirectory() as root:
            destination = Path(root) / 'model'
            with self.assertRaises(ValueError):
                module.provision(destination, False, None)
            self.assertFalse(destination.exists())

    def test_redirect_refuses_mirrors_and_insecure_download(self):
        for url in ['http://huggingface.co/model','https://unknown.example/model','https://huggingface.co.evil.example/model']:
            with self.assertRaises(ValueError):
                module.SafeRedirect().redirect_request(Request(module.SOURCE),None,302,'Found',{},url)

    def test_redirect_removes_token_from_official_cdn(self):
        request = Request(module.SOURCE, headers={'Authorization':'Bearer fake-test-token'})
        redirected = module.SafeRedirect().redirect_request(request,None,302,'Found',{},'https://cas-bridge.xethub.hf.co/test')
        self.assertIsNone(redirected.get_header('Authorization'))

if __name__ == '__main__':
    unittest.main()
