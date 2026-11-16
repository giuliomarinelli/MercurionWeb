"""RDB/AOF upgrade smoke on synthetic fixture copies only; no existing data volumes."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import time
import uuid


def smoke(old, candidate, report):
    if any(not re.fullmatch(r'sha256:[a-f0-9]{64}', image) for image in (old, candidate)):
        raise ValueError('Immutable image IDs required')
    with report.open('x', encoding='utf-8') as stream:
        stream.write('{"status":"running"}')
    run = uuid.uuid4().hex
    label = 'mercurion.redis-update=' + run
    containers, volumes, checks, errors = [], [], [], []
    result = dict(runId=run, status='failed', oldImage=old, candidateImage=candidate,
                  syntheticOnly=True, productionDataRead=False, vmChanged=False,
                  checks=checks, cleanupErrors=errors)

    def docker(*args):
        value = subprocess.run(['docker', '--context', 'desktop-linux', *args],
                               capture_output=True, text=True, timeout=90)
        if value.returncode:
            raise RuntimeError('redis-fixture-docker-operation-failed')
        return value.stdout.strip()

    def ready(name):
        for _ in range(60):
            try:
                if docker('exec', name, 'redis-cli', 'PING') == 'PONG':
                    return
            except RuntimeError:
                pass
            time.sleep(.1)
        raise RuntimeError('redis-fixture-readiness-failed')

    def create(name, image, volume, mode):
        containers.append(name)
        docker('run', '-d', '--pull', 'never', '--name', name, '--label', label,
               '--network', 'none', '--read-only', '--cap-drop', 'ALL',
               '--security-opt', 'no-new-privileges:true', '--user', '999:1000',
               '--memory', '128m', '--pids-limit', '64', '--mount',
               'type=volume,src='+volume+',dst=/data', '--entrypoint', 'redis-server', image,
               '--dir', '/data', '--save', '', '--appendonly', 'yes' if mode == 'aof' else 'no',
               '--appendfsync', 'always', '--notify-keyspace-events', 'Exg')
        ready(name)

    try:
        for image in (old, candidate):
            identity = json.loads(docker('image', 'inspect', image))[0]
            if identity['Id'] != image or (identity['Os'], identity['Architecture']) != ('linux', 'amd64'):
                raise ValueError('redis-fixture-image-identity-mismatch')
        for mode in ('rdb', 'aof'):
            result['phase'] = mode + '-prepare'
            prefix = 'redis-update-' + run + '-' + mode
            source, target = prefix+'-source', prefix+'-copy'
            for volume in (source, target):
                if docker('volume', 'ls', '-q', '--filter', 'name=^'+volume+'$'):
                    raise RuntimeError('redis-fixture-volume-collision')
                docker('volume', 'create', '--label', label, volume)
                volumes.append(volume)
            original, updated = prefix+'-old', prefix+'-new'
            create(original, old, source, mode)
            for command in (('SET', 'fixture:string', 'preserved'),
                            ('HSET', 'fixture:hash', 'field', 'value'),
                            ('ZADD', 'fixture:zset', '12', 'member'),
                            ('XADD', 'fixture:stream', '*', 'field', 'event'),
                            ('SETEX', 'fixture:ttl', '600', 'expiring')):
                docker('exec', original, 'redis-cli', *command)
            docker('exec', original, 'redis-cli', 'SAVE')
            docker('stop', '--time', '15', original)
            result['phase'] = mode + '-copy'
            docker('run', '--rm', '--pull', 'never', '--network', 'none', '--read-only',
                   '--label', label,
                   '--user', '999:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
                   '--mount', 'type=volume,src='+source+',dst=/source,readonly',
                   '--mount', 'type=volume,src='+target+',dst=/data', '--entrypoint', 'sh', candidate,
                   '-ec', 'cp -R /source/. /data/')
            create(updated, candidate, target, mode)
            result['phase'] = mode + '-readback'
            expected = [(('GET', 'fixture:string'), 'preserved'),
                        (('HGET', 'fixture:hash', 'field'), 'value'),
                        (('ZSCORE', 'fixture:zset', 'member'), '12'),
                        (('XLEN', 'fixture:stream'), '1'),
                        (('EVAL', 'return redis.call("GET",KEYS[1])', '1', 'fixture:string'), 'preserved')]
            for command, value in expected:
                if docker('exec', updated, 'redis-cli', '--raw', *command) != value:
                    raise RuntimeError('redis-fixture-data-regression')
            if int(docker('exec', updated, 'redis-cli', 'TTL', 'fixture:ttl')) <= 0:
                raise RuntimeError('redis-fixture-expiry-regression')
            docker('restart', updated)
            ready(updated)
            if docker('exec', updated, 'redis-cli', 'GET', 'fixture:string') != 'preserved':
                raise RuntimeError('redis-fixture-restart-regression')
            docker('exec', updated, 'redis-cli', 'SET', 'fixture:string', 'candidate-only')
            docker('start', original)
            ready(original)
            if docker('exec', original, 'redis-cli', 'GET', 'fixture:string') != 'preserved':
                raise RuntimeError('redis-fixture-source-not-preserved')
            checks.append(dict(mode=mode, copiedStatePreserved=True, restart=True,
                               lua=True, ttl=True, originalFixtureUnchanged=True))
        result['status'] = 'passed'
        result['phase'] = 'finished'
    except Exception as error:
        result['errorType'] = type(error).__name__
    finally:
        for kind, identifiers in (('container', reversed(containers)), ('volume', reversed(volumes))):
            for identifier in identifiers:
                try:
                    info = json.loads(docker('inspect', '--type', kind, identifier))[0]
                    labels = info.get('Config', info).get('Labels', {}) or {}
                    if labels.get('mercurion.redis-update') != run:
                        raise RuntimeError('redis-fixture-cleanup-ownership-mismatch')
                    if kind == 'container':
                        docker('rm', '--force', identifier)
                    else:
                        docker('volume', 'rm', identifier)
                except RuntimeError:
                    errors.append(kind+'-cleanup-failed')
        if errors:
            result['status'] = 'failed'
        report.write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--old-image', required=True)
    parser.add_argument('--candidate-image', required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--execute', action='store_true', required=True)
    args = parser.parse_args()
    result = smoke(args.old_image, args.candidate_image, args.report.resolve())
    print(json.dumps(result))
    raise SystemExit(0 if result['status'] == 'passed' else 1)
