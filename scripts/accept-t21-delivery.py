"""Service-level artifact acceptance on an owned internal network; never deploy."""
import argparse
import importlib.util
import json
from pathlib import Path
import queue
import re
import shutil
import subprocess
import threading
import time
import uuid

spec = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('coordinate-delivery.py'))
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)
NATS_IMAGE = 'nats@sha256:77a161c7d888a1791d5a46b50cd87a2f8466ce40a33cbb51238d227ace01e35a'


def docker(*args, timeout=120):
    return subprocess.check_output(['docker', *args], text=True, timeout=timeout).strip()


def inspect(container):
    return json.loads(docker('inspect', container))[0]


def logs(container):
    result = subprocess.run(['docker', 'logs', container], text=True, capture_output=True, timeout=20, check=True)
    return result.stdout + result.stderr


def load_bundle(path):
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if (manifest.get('schema_version') != 1 or manifest.get('eligible_for_integrated_acceptance') is not True
            or manifest.get('missing_components') or manifest.get('blocked_components')):
        raise ValueError('Only complete, policy-eligible bundles are accepted')
    for role in ['web-ng', 'web-node', 'tox21']:
        record = manifest['components'][role]
        actual = delivery.component((path.parent / record['record']).parent, role, manifest['web_revision'], path.parent)
        if actual != record or not actual['security_eligible'] or actual['target'] != 'production':
            raise ValueError('Bundle identity, policy or production target mismatch')
    return manifest


def validate_pair(candidate, previous):
    roles = ['web-ng', 'web-node', 'tox21']
    if all(candidate['components'][role]['config_digest'] == previous['components'][role]['config_digest'] for role in roles):
        raise ValueError('Rollback requires distinct image sets')
    if candidate['components']['tox21']['model'] != previous['components']['tox21']['model']:
        raise ValueError('This acceptance scenario requires the same QA weights, thresholds and manifest')


def restore_images(path, manifest):
    images = {}
    for role, record in manifest['components'].items():
        directory = (path.parent / record['record']).parent
        loaded = docker('load', '--input', str(directory / 'image.tar'))
        identifiers = re.findall(r'Loaded image ID: (sha256:[0-9a-f]{64})', loaded)
        if len(identifiers) != 1:
            raise ValueError('Cannot identify restored image')
        image = inspect(identifiers[0])
        digest, config = delivery.archive_config(directory / 'image.tar')
        if (digest != record['config_digest'] or image['Config']['Labels'] != config['config']['Labels']
                or image['RootFS']['Layers'] != config['rootfs']['diff_ids']):
            raise ValueError('Restored artifact differs from selected bundle')
        images[role] = identifiers[0]
    return images


class Probe:
    def __init__(self, image, name, network, output, owned):
        self.name = name
        self.messages = queue.Queue()
        self.counter = 0
        self.log = (output / (name + '.stderr.log')).open('w', encoding='utf-8')
        owned.append(name)
        script = Path(__file__).with_name('t21-service-probe.cjs').resolve()
        self.process = subprocess.Popen(['docker', 'run', '-i', '--name', name, '--network', network,
            '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--mount', f'type=bind,src={script},dst=/qa/probe.cjs,readonly',
            '--env', 'QA_NATS_URL=nats://nats:4222', '--entrypoint', 'node', image, '/qa/probe.cjs'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=self.log, text=True, bufsize=1)
        threading.Thread(target=self.read, daemon=True).start()
        first = self.receive(30)
        if not first.get('ready'):
            raise ValueError('Resident Web client did not initialize: ' + str(first))
        self.session = first['session']
        self.identity = first['identity']

    def read(self):
        for line in self.process.stdout:
            if line.startswith('T21_RESULT '):
                self.messages.put(json.loads(line[len('T21_RESULT '):]))

    def receive(self, timeout):
        try:
            return self.messages.get(timeout=timeout)
        except queue.Empty:
            raise TimeoutError('No response from resident Web artifact client') from None

    def request(self, command):
        self.counter += 1
        self.process.stdin.write(json.dumps({'id': self.counter, 'command': command}) + '\n')
        self.process.stdin.flush()
        value = self.receive(20)
        if value.get('id') != self.counter or value.get('session') != self.session or not value.get('ok'):
            raise ValueError('Resident probe command failed: ' + str(value))
        return value.get('result')

    def close(self):
        self.request('close')
        self.process.stdin.close()
        if self.process.wait(timeout=15) != 0:
            raise ValueError('Web client did not exit cleanly')
        self.log.close()


def ready(probe, worker):
    deadline = time.monotonic() + 90
    consecutive = 0
    result = None
    while consecutive < 2:
        try:
            result = probe.request('positive')
            consecutive += 1
        except ValueError:
            consecutive = 0
            if not inspect(worker)['State']['Running'] or time.monotonic() > deadline:
                raise
        time.sleep(0.4)
    return result


def start_pair(images, manifest, network, prefix, output, owned):
    worker_name = prefix + '-worker'
    owned.append(worker_name)
    worker = docker('run', '-d', '--name', worker_name, '--network', network,
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--env', 'NATS_URL=nats://nats:4222',
        '--env', 'JWT_PUBLIC_KEY_PATH=/qa/intentionally-absent.pem', images['tox21'])
    frontend_name = prefix + '-frontend'
    owned.append(frontend_name)
    frontend = docker('run', '-d', '--name', frontend_name, '--network', network,
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', images['web-ng'])
    deadline = time.monotonic() + 20
    while True:
        response = subprocess.run(['docker', 'exec', frontend, 'wget', '-q', '-O', '-', 'http://127.0.0.1:3497/'],
                                  text=True, capture_output=True, timeout=5)
        if response.returncode == 0 and '<html' in response.stdout.lower():
            break
        if time.monotonic() > deadline:
            raise ValueError('Frontend artifact index is not ready')
        time.sleep(0.3)
    probe = Probe(images['web-node'], prefix + '-client', network, output, owned)
    record = manifest['components']['web-node']
    if probe.identity != {'revision': record['revision'], 'version': record['version']}:
        raise ValueError('Compiled Web identity differs from selected candidate')
    result = ready(probe, worker)
    for name in [worker, frontend, probe.name]:
        if inspect(name)['HostConfig']['PortBindings']:
            raise ValueError('Acceptance containers must not publish host ports')
    return probe, worker, frontend, result


def stop_pair(probe, worker, frontend):
    probe.close()
    docker('stop', '--time', '15', worker)
    state = inspect(worker)['State']
    if state['ExitCode'] != 0 or state['OOMKilled']:
        raise ValueError('Worker did not stop gracefully')
    docker('stop', '--time', '5', frontend)


def invalid_packages(image, package, output, owned):
    outcomes = {}
    for case in ['missing-weights', 'missing-thresholds', 'threshold-checksum', 'incompatible-model']:
        directory = output / case
        directory.mkdir()
        for name in ['weights.pt', 'thresholds.json', 'manifest.json']:
            if (case == 'missing-weights' and name == 'weights.pt') or (case == 'missing-thresholds' and name == 'thresholds.json'):
                continue
            shutil.copyfile(package / name, directory / name)
        if case == 'threshold-checksum':
            (directory / 'thresholds.json').write_text('{}', encoding='utf-8')
        if case == 'incompatible-model':
            path = directory / 'manifest.json'
            value = json.loads(path.read_text())
            value['fingerprint']['bits'] = 1024
            path.write_text(json.dumps(value), encoding='utf-8')
        name = 't21-invalid-' + uuid.uuid4().hex[:10]
        owned.append(name)
        container = docker('run', '-d', '--name', name, '--network', 'none', '--read-only',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--env', 'NATS_URL=nats://unused:4222',
            '--env', 'MODEL_PACKAGE_DIR=/qa/model', '--mount', f'type=bind,src={directory},dst=/qa/model,readonly', image)
        code = docker('wait', container, timeout=25)
        output_logs = logs(container)
        (output / (case + '.log')).write_text(output_logs, encoding='utf-8')
        if code != '1' or 'FATAL: ModelPackageError' not in output_logs:
            raise ValueError('Invalid package did not fail at the model boundary: ' + case)
        outcomes[case] = {'exit_code': 1, 'failure': 'ModelPackageError'}
    return outcomes


def record_event(report, value):
    report['events'].append(value)
    print(json.dumps({'phase': value['phase']}), flush=True)


def accept(args):
    for name in ['candidate', 'previous', 'model_package', 'output']:
        setattr(args, name, getattr(args, name).resolve())
    # Validate artifact evidence before creating any Docker resource.
    candidate, previous = load_bundle(args.candidate), load_bundle(args.previous)
    validate_pair(candidate, previous)
    model = json.loads((args.model_package / 'manifest.json').read_text())
    if model != candidate['components']['tox21']['model']:
        raise ValueError('Negative-fixture package differs from candidate model')
    for name, digest in model['files'].items():
        if delivery.checksum(args.model_package / name) != digest:
            raise ValueError('Negative-fixture package checksum mismatch')
    args.output.mkdir(parents=True, exist_ok=False)
    report = {'level': 'compiled-nest-scientific-services-to-real-worker', 'status': 'failed',
              'deployed': False, 'candidate_manifest_sha256': delivery.checksum(args.candidate),
              'previous_manifest_sha256': delivery.checksum(args.previous),
              'driver_sha256': delivery.checksum(Path(__file__)),
              'probe_sha256': delivery.checksum(Path(__file__).with_name('t21-service-probe.cjs')), 'events': []}
    owned, network = [], None
    try:
        current_images = restore_images(args.candidate, candidate)
        previous_images = restore_images(args.previous, previous)
        prefix = 't21-accept-' + uuid.uuid4().hex[:10]
        network = docker('network', 'create', '--internal', prefix)
        if json.loads(docker('network', 'inspect', network))[0]['Internal'] is not True:
            raise ValueError('Acceptance network must be internal')
        broker_name = prefix + '-nats'
        owned.append(broker_name)
        broker = docker('run', '-d', '--name', broker_name, '--network', network, '--network-alias', 'nats', NATS_IMAGE)
        if inspect(broker)['HostConfig']['PortBindings']:
            raise ValueError('Broker must not publish host ports')
        deadline = time.monotonic() + 20
        while 'Server is ready' not in logs(broker):
            if time.monotonic() > deadline:
                raise ValueError('Owned broker did not start')
            time.sleep(0.3)
        probe, worker, frontend, reference = start_pair(previous_images, previous, network, prefix + '-previous', args.output, owned)
        record_event(report, {'phase': 'previous-ready', 'result': reference})
        stop_pair(probe, worker, frontend)
        probe, worker, frontend, current = start_pair(current_images, candidate, network, prefix + '-candidate', args.output, owned)
        if current != reference:
            raise ValueError('Same QA model produced different results after image replacement')
        record_event(report, {'phase': 'candidate-ready', 'result': current,
            'namespace': probe.request('wrong-namespace'), 'auth': probe.request('public-auth'),
            'invalid_input': probe.request('invalid-input')})
        worker_started, client_started = inspect(worker)['State']['StartedAt'], inspect(probe.name)['State']['StartedAt']
        docker('stop', '--time', '5', broker)
        outage_started = time.monotonic()
        outage = probe.request('outage')
        outage_seconds = time.monotonic() - outage_started
        if outage_seconds > 10:
            raise ValueError('Broker failure was not surfaced within the QA deadline')
        if not inspect(worker)['State']['Running'] or not inspect(probe.name)['State']['Running']:
            raise ValueError('Worker or Web client exited during broker outage')
        docker('start', broker)
        recovered = ready(probe, worker)
        if (recovered != reference or inspect(worker)['State']['StartedAt'] != worker_started
                or inspect(probe.name)['State']['StartedAt'] != client_started):
            raise ValueError('Recovery restarted a client or changed the result')
        record_event(report, {'phase': 'broker-recovery', 'same_web_session': probe.session,
                                'outage': outage, 'outage_seconds': round(outage_seconds, 3), 'same_processes': True})
        docker('stop', '--time', '15', worker)
        if inspect(worker)['State']['ExitCode'] != 0:
            raise ValueError('Candidate worker shutdown failed')
        docker('start', worker)
        if ready(probe, worker) != reference or inspect(worker)['State']['StartedAt'] == worker_started:
            raise ValueError('Worker restart changed the result')
        record_event(report, {'phase': 'worker-restart', 'metrics': probe.request('metrics')})
        stop_pair(probe, worker, frontend)
        # Reload prior archives, not movable tags, before returning to the prior pair.
        previous_images = restore_images(args.previous, previous)
        probe, worker, frontend, rollback = start_pair(previous_images, previous, network, prefix + '-rollback', args.output, owned)
        if rollback != reference:
            raise ValueError('Rollback result differs from prior compatible pair')
        stop_pair(probe, worker, frontend)
        record_event(report, {'phase': 'rollback', 'restored_archives': True, 'same_model_configuration_results': True})
        report['invalid_packages'] = invalid_packages(current_images['tox21'], args.model_package, args.output, owned)
        report['status'] = 'passed'
    except Exception as error:
        report['error'] = str(error)
        raise
    finally:
        cleanup_errors = []
        for name in owned:
            log_result = subprocess.run(['docker', 'logs', name], capture_output=True, text=True, timeout=20)
            (args.output / (name + '.log')).write_text(log_result.stdout + log_result.stderr, encoding='utf-8')
            result = subprocess.run(['docker', 'rm', '--force', name], capture_output=True, text=True, timeout=20)
            if result.returncode:
                cleanup_errors.append(name)
        if network:
            result = subprocess.run(['docker', 'network', 'rm', network], capture_output=True, timeout=20)
            if result.returncode:
                cleanup_errors.append('network')
        report['cleanup_complete'] = not cleanup_errors
        if cleanup_errors:
            report['cleanup_errors'] = cleanup_errors
            report['status'] = 'failed'
        (args.output / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    if report['status'] != 'passed':
        raise ValueError('Acceptance cleanup failed')
    print(json.dumps({'status': report['status'], 'output': str(args.output), 'level': report['level']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--previous', type=Path, required=True)
    parser.add_argument('--model-package', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    accept(parser.parse_args())
