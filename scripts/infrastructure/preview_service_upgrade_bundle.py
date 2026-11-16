"""Prepare and verify a public, strict-scanned shared/preview upgrade bundle."""
import argparse
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import uuid

import preview_server_bundle as base

ROOT=Path(__file__).resolve().parents[2]
VERSIONS={'postgres':'16.16','redis':'8.2.9','nats':'2.12.15','meilisearch':'1.14.0','edge':'1.30.6'}
USERS={'postgres':'70:70','redis':'999:1000',
       'nats':'10021:10021','meilisearch':'10001:10001','edge':'10101:10101'}
HELPERS={name+'.py' for name in ('guest_preview_service_upgrade','meili_logical_transfer',
    'guest_preview_recovery_inventory','guest_preview_cold_recovery','guest_preview_servers',
    'preview_server_bundle','preview_server_secrets','preview_compose','secret_delivery',
    'prepare_tox21_transport','guest_artifact_preflight','run_tox21_vm_pilot','preview_service_upgrade_bundle')}
PUBLIC=base.OPS|{'deployment/deployment-schema.json','scripts/coordinate-delivery.py','models.json'}|{
    'scripts/infrastructure/'+name for name in HELPERS}|{'preview_application_rpc.py','meili-source-defaults.json'}
IMAGE_FILES={'image.tar','sbom.cdx.json','vulnerabilities.json','evidence.json'}


def checksum(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(root):
    value=json.loads((root/'upgrade-manifest.json').read_text())
    expected=PUBLIC|{'images/'+role+'/'+name for role in VERSIONS for name in IMAGE_FILES}
    if (value.get('scope')!='shared-preview-server-upgrade' or value.get('schemaVersion')!=1
            or not all(re.fullmatch('[a-f0-9]{32}',value.get(k,'')) for k in ('upgradeId','serverRunId'))
            or not re.fullmatch('[a-f0-9]{64}',value.get('serverManifestSha256',''))
            or set(value.get('files',{}))!=expected or set(value.get('images',{}))!=set(VERSIONS)):
        raise ValueError('upgrade-bundle-scope')
    for name,wanted in value['files'].items():
        path=base.transport.regular(root/name)
        if checksum(path)!=wanted:raise ValueError('upgrade-bundle-checksum')
    models=json.loads((root/'models.json').read_text())
    base.preview_compose.validate(models)
    services={name:spec for model in models.values() for name,spec in model['services'].items()}
    names={'postgres':'postgres-preview','redis':'redis-preview','nats':'nats-preview','meilisearch':'meilisearch','edge':'nginx-edge'}
    if any(services[names[role]].get('labels',{}).get('mercurion.server.version')!=version for role,version in VERSIONS.items()):
        raise ValueError('upgrade-compose-server-version-contract')
    for role,version in VERSIONS.items():
        folder=root/'images'/role
        record=json.loads((folder/'evidence.json').read_text())
        digest,config=base.delivery.archive_config(folder/'image.tar')
        labels=config['config'].get('Labels',{})
        if (record.get('securityEligible') is not True or record['configDigest']!=digest
                or config['config'].get('User')!=USERS[role]
                or labels.get('org.mercurion.runtime.role')!=role
                or labels.get('org.opencontainers.image.source')!='https://github.com/giuliomarinelli/MercurionWeb'
                or (config['os'],config['architecture'])!=('linux','amd64')
                or not base.delivery.security_summary(json.loads((folder/'vulnerabilities.json').read_text()),digest)['eligible']
                or value['images'][role]!={'configDigest':digest,'version':version}):
            raise ValueError('upgrade-image-or-policy')
        stamp=record.get('exportedAtUtc',record.get('observedAtUtc'))
        age=(datetime.now(timezone.utc)-datetime.fromisoformat(stamp)).total_seconds() if stamp else None
        if age is None or not 0<=age<=86400:
            raise ValueError('upgrade-scan-older-than-24h')
        sbom=json.loads((folder/'sbom.cdx.json').read_text())
        if sbom.get('bomFormat')!='CycloneDX' or not sbom.get('components'):raise ValueError('upgrade-sbom-required')
    return value


def prepare(evidence,postgres,baseline,inspection,defaults,output):
    original=base.verify(baseline)
    snapshot=json.loads((baseline/'receipts'/('recovery-inventory-'+inspection+'.json')).read_text())
    if (snapshot.get('status')!='inventoried' or snapshot.get('runId')!=original['runId']
            or not snapshot.get('secretRunPresent') or not all(c['running'] for c in snapshot['containers'])):
        raise ValueError('upgrade-running-inventory-required')
    output.mkdir(parents=True,exist_ok=False)
    paths={'postgres':postgres,'redis':evidence/'redis-pinned','meilisearch':evidence/'meilisearch-pinned',
           'nats':evidence/'nats-go1274','edge':evidence/'edge'}
    images={}
    for role,directory in paths.items():
        target=output/'images'/role;target.mkdir(parents=True)
        for name in IMAGE_FILES-{'evidence.json'}:shutil.copyfile(directory/name,target/name)
        source=directory/('server.json' if role=='postgres' else 'candidate.json')
        shutil.copyfile(source,target/'evidence.json')
        record=json.loads(source.read_text())
        images[role]={'configDigest':record['configDigest'],'version':VERSIONS[role]}
    for name in PUBLIC-{'preview_application_rpc.py','meili-source-defaults.json','models.json'}:
        target=output/name;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes((ROOT/name).read_bytes().replace(b'\r\n',b'\n'))
    shutil.copyfile(ROOT/'scripts/infrastructure/preview_application_rpc.py',output/'preview_application_rpc.py')
    shutil.copyfile(defaults,output/'meili-source-defaults.json')
    models=base.preview_compose.render();base.preview_compose.validate(models)
    (output/'models.json').write_text(json.dumps(models,indent=2))
    value=dict(schemaVersion=1,scope='shared-preview-server-upgrade',upgradeId=uuid.uuid4().hex,
               toolRevision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
               serverRunId=original['runId'],serverManifestSha256=checksum(baseline/'server-bootstrap.json'),
               bootId=snapshot['bootId'],inspectionId=inspection,images=images,
               files={name:checksum(output/name) for name in PUBLIC|{
                   'images/'+role+'/'+name for role in VERSIONS for name in IMAGE_FILES}})
    (output/'upgrade-manifest.json').write_text(json.dumps(value,indent=2))
    return verify(output)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence',required=True,type=Path)
    parser.add_argument('--postgres',required=True,type=Path)
    parser.add_argument('--baseline',required=True,type=Path)
    parser.add_argument('--inspection',required=True)
    parser.add_argument('--meili-defaults',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    value=prepare(args.evidence,args.postgres,args.baseline,args.inspection,args.meili_defaults,args.output)
    print(json.dumps(dict(status='upgrade-bundle-ready',upgradeId=value['upgradeId'],images=value['images'])))
