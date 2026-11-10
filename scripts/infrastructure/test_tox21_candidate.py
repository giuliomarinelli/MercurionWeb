"""Fail-closed candidate evidence checks; stdlib only, no Docker/VM required."""
import ast
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

import smoke_tox21_candidate as candidate
from materialize_tox21_candidate import allowed_file


def worker():
    return {'Image': 'sha256:fixture', 'Config': {'User': '10021:10021',
            'Cmd': ['python', '-m', 'bootstrap_secrets'], 'Env': ['PY_ENV=staging']},
            'HostConfig': {'ReadonlyRootfs': True, 'PortBindings': {}},
            'Mounts': [{'Destination': '/run/mercurion', 'RW': False}],
            'State': {'Running': True, 'StartedAt': 'initial'}}


class CandidateEvidenceTests(unittest.TestCase):
    def test_build_context_excludes_host_secrets_and_training_data(self):
        for name in ('main.py', 'requirements/runtime-linux-cpu.lock',
                     'docs/container-policy.json', 'scripts/check_container_image.py'):
            self.assertTrue(allowed_file(name), name)
        for name in ('.env.staging', 'api/private.pem', 'api/../private.py', '/api/example.py',
                     'outputs/models/best_model.pt', 'data/processed/X_train.npy', '.git/config'):
            self.assertFalse(allowed_file(name), name)

    def test_all_real_rpc_and_explicit_auth_evidence_required(self):
        result = {'subjects': 5, 'inference': 'real', 'rdkit': 'real',
                  'pubchem': 'validation-only', 'invalidSmiles': 'passed',
                  'explicitBrokerDenials': ['missing', 'wrong-password', 'unknown-user']}
        self.assertEqual(candidate.validate_probe(result), result)
        for field in result:
            altered = {key: value for key, value in result.items() if key != field}
            with self.subTest(field=field), self.assertRaises(ValueError):
                candidate.validate_probe(altered)
        for altered in [{**result, 'inference': 'synthetic'},
                        {**result, 'subjects': 4},
                        {**result, 'explicitBrokerDenials': ['timeout']},
                        {**result, 'pubchem': 'real'}]:
            with self.assertRaises(ValueError):
                candidate.validate_probe(altered)

    def test_worker_identity_and_readonly_file_mount(self):
        with patch.object(candidate, 'inspect', return_value=worker()):
            self.assertEqual(candidate.check_worker('id', 'sha256:fixture'), 'initial')
        for change in [
            lambda item: item.update(Image='sha256:other'),
            lambda item: item['Config'].update(User='0:0'),
            lambda item: item['Config'].update(Cmd=['python', '-m', 'main']),
            lambda item: item['Config'].update(Env=['NATS_PASSWORD=synthetic-only']),
            lambda item: item['Config'].update(Env=['AUTH_INFERENCE=allow']),
            lambda item: item['HostConfig'].update(ReadonlyRootfs=False),
            lambda item: item['HostConfig'].update(PortBindings={'4222/tcp': []}),
            lambda item: item['Mounts'][0].update(RW=True),
            lambda item: item['Mounts'].append({'Destination': '/app/main.py', 'RW': False}),
        ]:
            altered = worker()
            change(altered)
            with patch.object(candidate, 'inspect', return_value=altered), self.assertRaises(AssertionError):
                candidate.check_worker('id', 'sha256:fixture')

    def test_probe_failure_is_not_readiness_success(self):
        response = types.SimpleNamespace(returncode=1, stdout='', stderr='{"errorType":"AssertionError"}')
        with patch.object(candidate, 'inspect', return_value=worker()), \
                patch.object(candidate, 'docker', return_value=response), self.assertRaises(RuntimeError):
            candidate.wait_probe('worker', 'requester')
        response = types.SimpleNamespace(returncode=0, stdout='{}', stderr='')
        with patch.object(candidate, 'inspect', return_value=worker()), \
                patch.object(candidate, 'docker', return_value=response), self.assertRaises(ValueError):
            candidate.wait_probe('worker', 'requester')

    def test_remote_docker_endpoint_rejected_before_mutation(self):
        output = json.dumps([{'Endpoints': {'docker': {'Host': 'tcp://remote:2376'}}}])
        with tempfile.TemporaryDirectory() as directory, \
                patch('sys.argv', ['probe', '--image', 'fixture', '--revision', 'revision',
                                  '--version', 'version', '--report', str(Path(directory) / 'report.json')]), \
                patch.object(candidate, 'value', return_value=output) as command, self.assertRaises(ValueError):
            candidate.main()
        self.assertEqual(command.call_count, 1)

    def test_embedded_scripts_compile_without_import_side_effects(self):
        for name in ('INIT', 'FILE_STATE', 'PROBE'):
            ast.parse(getattr(candidate, name), filename=name)

    def test_partial_preparation_cleans_only_labelled_resources(self):
        image = {'Os': 'linux', 'Architecture': 'amd64', 'Id': 'sha256:fixture', 'Config': {'Labels': {
            'org.opencontainers.image.revision': 'revision', 'org.opencontainers.image.version': 'version',
            'org.mercurion.environment': 'staging'}}}
        remaining = ['owned-volume']
        selections = []

        def command(*args):
            if args[:2] == ('context', 'inspect'):
                return json.dumps([{'Endpoints': {'docker': {'Host': 'unix:///var/run/docker.sock'}}}])
            if args[:2] == ('image', 'inspect'):
                return json.dumps([image])
            if args[:2] == ('volume', 'create'):
                return 'owned-volume'
            if args[:2] == ('network', 'create'):
                raise RuntimeError('simulated-prepare-failure')
            if '--filter' in args:
                selections.append(args[args.index('--filter') + 1])
                return '\n'.join(remaining) if args[:2] == ('volume', 'ls') else ''
            raise AssertionError(args)

        def remove(*args, **kwargs):
            self.assertEqual(args, ('volume', 'rm', 'owned-volume'))
            remaining.clear()
            return types.SimpleNamespace(returncode=0)

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'report.json'
            with patch('sys.argv', ['probe', '--image', 'fixture', '--revision', 'revision',
                                   '--version', 'version', '--report', str(path)]), \
                    patch.object(candidate, 'value', side_effect=command), \
                    patch.object(candidate, 'docker', side_effect=remove), patch('builtins.print'):
                self.assertEqual(candidate.main(), 1)
            report = json.loads(path.read_text())
        self.assertEqual(report['status'], 'failed')
        self.assertEqual(report['cleanupErrors'], [])
        self.assertTrue(selections)
        self.assertEqual(set(selections), {'label=' + candidate.LABEL + '=' + report['runId']})


if __name__ == '__main__':
    unittest.main()
