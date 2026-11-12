"""Read-only service audit and VM-specific HTTP edge constraints."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import audit_development_services as audit
import preview_compose
import scan_service_candidate
import smoke_redis_update


class AuditContracts(unittest.TestCase):
    def test_candidate_tags_and_unknown_roles_are_refused_before_filesystem_or_docker(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)/'not-created'
            with patch.object(audit,'command') as command:
                for image, role in [('redis:latest','redis'), ('sha256:'+'a'*64,'unknown')]:
                    with self.subTest(role=role), self.assertRaises(ValueError):
                        scan_service_candidate.scan(image,role,output)
                command.assert_not_called()
            self.assertFalse(output.exists())

    def test_redis_fixture_rejects_tags_without_touching_existing_data(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)/'not-created.json'
            with patch.object(smoke_redis_update.subprocess,'run') as command, self.assertRaises(ValueError):
                smoke_redis_update.smoke('redis:latest','sha256:'+'a'*64,output)
            command.assert_not_called()
            self.assertFalse(output.exists())

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
