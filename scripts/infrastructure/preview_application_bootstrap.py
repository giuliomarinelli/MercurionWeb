"""Owner-invoked initial application bootstrap. Private values only over SSH stdin."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

import preview_application_bundle as bundle
import preview_application_secrets as receiver
import preview_credentials
from preview_server_bootstrap import COPY_RELEASE
from synthetic_secret_delivery import Step, COMMON, remote, transport


class LocalConfigurationError(ValueError):
    """Public diagnostic from before any transport or persistent attempt."""


def load_configuration(path):
    # Executed only by the owner with --execute. Never expose parser snippets or
    # arbitrary exception text: only fixed validator messages/known field names.
    try:
        value = json.loads(path.read_text(encoding='utf-8-sig'))
    except FileNotFoundError:
        raise LocalConfigurationError('configuration-file-not-found') from None
    except (json.JSONDecodeError, UnicodeError):
        raise LocalConfigurationError('configuration-invalid-json-or-encoding') from None
    except OSError:
        raise LocalConfigurationError('configuration-file-unreadable') from None
    try:
        preview_credentials.validate(value)
    except (ValueError, TypeError, KeyError):
        # Derive diagnostics from known schema fields, not from exception text
        # which might embed unexpected private input.
        missing = []
        if isinstance(value, dict):
            for section, fields in (('providers', preview_credentials.PROVIDERS),
                                    ('meilisearchClients', ('searchKey', 'logKey'))):
                mapping = value.get(section)
                if isinstance(mapping, dict):
                    missing.extend(section + '.' + name for name in fields
                        if mapping.get(name) is None or isinstance(mapping.get(name), str)
                        and (not mapping[name].strip() or mapping[name].startswith('<')))
        reason = 'configuration-validation-rejected'
        if missing:
            reason += '; missing-fields=' + ','.join(missing)
        raise LocalConfigurationError(reason) from None
    return value

COPY = COPY_RELEASE.replace('vm043-servers-', 'vm045-applications-').replace('server-bootstrap.json', 'application-bootstrap.json')
COPY = COPY.replace("('server-'+rid)", "('application-'+rid)").replace('guest_preview_servers.py', 'guest_preview_applications.py')
ENTRY = r'''
import hashlib,os,pathlib,runpy,stat,sys
rid,digest,phase=sys.argv[1:]
assert phase in ('receive','activate')
root=pathlib.Path('/opt/mercurion/releases')/('application-'+rid)
for path in (root,*root.parents):
 info=path.lstat();assert stat.S_ISDIR(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
raw=(root/'application-bootstrap.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==digest
manifest=__import__('json').loads(raw)
for name,wanted in manifest['files'].items():
 if name.startswith('servers/') or name.startswith('components/'):continue
 path=root/name;info=path.lstat();assert stat.S_ISREG(info.st_mode) and info.st_uid==0 and not info.st_mode&0o022
 assert hashlib.sha256(path.read_bytes()).hexdigest()==wanted
sys.path.insert(0,str(root/'scripts/infrastructure'))
script=root/'scripts/infrastructure'/('preview_application_secrets.py' if phase=='receive' else 'guest_preview_applications.py')
sys.argv=[str(script),'--run-id',rid] if phase=='receive' else [str(script),'activate','--root',str(root)]
runpy.run_path(str(script),run_name='__main__')
'''


def payload(configuration, identifier, edge):
    variables = preview_credentials.application_document(configuration, [edge + '/32'])
    documents = preview_credentials.server_documents(configuration)
    doc = dict(schemaVersion=1, runId=identifier, environment='preview', consumer='preview-applications', documents={
        'web-node': {'values.json': json.dumps(variables)}, 'tox21': documents['tox21'][2]})
    data = json.dumps(doc, separators=(',', ':')).encode()
    receiver.validate(data, identifier)
    if configuration['meilisearchServer']['masterKey'] in data.decode() or configuration['postgresServer']['adminPassword'] in data.decode():
        raise ValueError('server-admin-material-in-application-payload')
    return data


def fetch(root, identifier, name):
    output = root / 'receipts' / name
    output.parent.mkdir(exist_ok=True)
    if output.exists():
        raise ValueError('application-receipt-already-exists')
    if subprocess.run(['scp.exe', *COMMON, 'mercurion-server:/opt/mercurion/releases/application-' + identifier + '/' + name,
                       str(output)], timeout=180).returncode:
        raise ValueError('application-receipt-download-failed')
    result = json.loads(output.read_text(encoding='utf-8'))
    if result.get('runId') != identifier:
        raise ValueError('application-receipt-identity')
    return result, output


def execute(root, manifest, configuration):
    if os.name != 'nt':
        raise ValueError('windows-owner-terminal-required')
    if (root / 'execution-state.json').exists():
        raise ValueError('application-already-attempted-no-automatic-retry')
    # Owner terminal only. No .env, master key or private file is read by the agent.
    private = load_configuration(configuration)
    identifier = manifest['runId']
    state = dict(runId=identifier, phase='validated-owner-configuration', status='pending', isolationAccepted=False)
    path = root / 'execution-state.json'
    with path.open('x', encoding='utf-8') as stream:
        json.dump(state, stream)
    digest = bundle.servers.delivery.checksum(root / 'application-bootstrap.json')
    print(json.dumps(dict(runId=identifier, statePath=str(path))), flush=True)
    def progress(phase):
        state['phase'] = phase
        path.write_text(json.dumps(state, indent=2), encoding='utf-8')
        print('Fase: ' + phase, flush=True)
    try:
        progress('public-transfer')
        if subprocess.run(['scp.exe', *COMMON, '-r', str(root), 'mercurion-server:vm045-applications-' + identifier], timeout=600).returncode:
            raise ValueError('application-public-transfer')
        progress('load-server-checks-and-edge')
        script = 'EXPECTED_FILES=set(' + repr(sorted(bundle.expected_files())) + ')\n' + COPY
        code, _ = transport(Step('preflight', remote(script, identifier, digest, sudo=True), interactive=True))
        prepared, _ = fetch(root, identifier, 'preflight-result.json')
        if code or prepared.get('status') != 'ready' or prepared.get('readyForSecretDelivery') is not True:
            raise ValueError('application-preflight-failed')
        data = payload(private, identifier, prepared['edgeAddress'])
        progress('application-documents-receive')
        code, answer = transport(Step('receive', remote(ENTRY, identifier, digest, 'receive'), data=data))
        received = json.loads(answer) if not code else {}
        if code or received.get('runId') != identifier or received.get('status') != 'received':
            raise ValueError('application-receive-failed')
        progress('schema-and-application-start')
        code, _ = transport(Step('activate', remote(ENTRY, identifier, digest, 'activate', sudo=True), interactive=True))
        result, output = fetch(root, identifier, 'bootstrap-result.json')
        if code or result.get('status') != 'passed' or len(result.get('members', [])) != 4:
            raise ValueError('application-start-or-check-failed')
        state['status'] = 'passed'
        progress('finished')
        return dict(runId=identifier, status='passed', reportPath=str(output), edgeAddress=result['edgeAddress'],
            applicationServicesStarted=True, publishedPorts=False, publicAcceptance=False, isolationAccepted=False)
    except Exception:
        state['status'] = 'failed'
        path.write_text(json.dumps(state, indent=2), encoding='utf-8')
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--configuration', type=Path, default=Path.home() / '.mercurion/preview/configuration.json')
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--verify-existing', action='store_true')
    args = parser.parse_args()
    try:
        root = args.bundle.resolve()
        manifest = bundle.verify(root)
        if args.verify_existing:
            import preview_application_verification as verification
            verification.eligible(root, manifest)
            if args.execute:
                print(json.dumps(verification.execute(root, manifest)))
            else:
                print(json.dumps(dict(status='existing-application-verification-plan', runId=manifest['runId'],
                    privateConfigurationRead=False, sshStarted=False, servicesStarted=False)))
        elif args.execute:
            print(json.dumps(execute(root, manifest, args.configuration)))
        else:
            print(json.dumps(dict(status='application-plan', runId=manifest['runId'], imageCount=4,
                privateConfigurationRead=False, sshStarted=False, servicesStarted=False)))
    except LocalConfigurationError as error:
        print(json.dumps(dict(code='PREVIEW_CONFIGURATION_REJECTED', phase='local-configuration',
            reason=str(error), sshStarted=False, servicesStarted=False, valuesPrinted=False)), file=sys.stderr)
        raise SystemExit(1)
    except Exception:
        print(json.dumps(dict(code='PREVIEW_APPLICATION_BOOTSTRAP_FAILED',
            detail='Preserve runId, phase and receipts; do not retry or reset database')), file=sys.stderr)
        raise SystemExit(1)
