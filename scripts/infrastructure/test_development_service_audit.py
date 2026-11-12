"""Read-only service audit and VM-specific HTTP edge constraints."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import audit_development_services as audit
import preview_compose


class AuditContracts(unittest.TestCase):
    def test_compose_read_uses_explicit_empty_env_and_never_persists_credentials(self):
        def output(arguments, **kwargs):
            self.assertEqual(arguments[:4], ['docker','--context','desktop-linux','compose'])
            self.assertEqual(Path(arguments[arguments.index('--env-file')+1]).read_bytes(), b'')
            self.assertEqual(kwargs['env']['COMPOSE_DISABLE_ENV_FILE'], 'true')
            self.assertIn('docker_sl', str(arguments))
            return b'{"services":{}}'
        with patch.object(audit.subprocess,'check_output',side_effect=output):
            self.assertEqual(audit.development_model('desktop-linux'),dict(services={}))

    def test_duplicate_audit_directory_is_refused_before_docker(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(audit,'command') as command, \
                patch.object(audit,'development_model') as model, self.assertRaises(FileExistsError):
            audit.audit('desktop-linux',Path(directory))
        command.assert_not_called(); model.assert_not_called()

    def test_current_vm_nginx_is_http_only_and_independent_of_kubernetes(self):
        source=(preview_compose.ROOT/'deployment/local-vm/operational/nginx.conf').read_text(encoding='utf-8')
        self.assertTrue(preview_compose.validate_nginx(source))
        variants=[source.replace('listen 80;', 'listen 443 ssl;'),
                  source+'\nssl_certificate /private/server.pem;',
                  source+'\nlocation /maintenance { return 503; }',
                  source+'\nset $maintenance_mode 1;',
                  source.replace('http://web-node-preview:8098','https://web-node-preview:8098'),
                  source+'\ninclude /etc/nginx/configmap/server.conf;']
        for text in variants:
            with self.subTest(text=text[-80:]), self.assertRaises(ValueError):
                preview_compose.validate_nginx(text)


if __name__=='__main__': unittest.main()
