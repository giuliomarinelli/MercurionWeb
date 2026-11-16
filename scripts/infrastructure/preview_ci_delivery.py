"""Installed Windows delivery driver; executes trusted local tools, never downloaded code."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.error
import urllib.request
import uuid
import zipfile

import preview_application_rollout as rollout


def eligible(run, repository, sha):
    return (run.get('event') == 'push' and run.get('head_branch') == 'preview'
            and run.get('conclusion') == 'success' and run.get('status') == 'completed'
            and run.get('head_sha') == sha and run.get('path') == '.github/workflows/ci.yml'
            and run.get('head_repository', {}).get('full_name') == repository)


def api(repository, path, token):
    request = urllib.request.Request('https://api.github.com/repos/'+repository+path,
        headers={'Authorization': 'Bearer '+token, 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def unpack(path, target):
    target.mkdir()
    with zipfile.ZipFile(path) as archive:
        names = set()
        total = 0
        for member in archive.infolist():
            if member.is_dir():
                continue
            name = member.filename
            if (not re.fullmatch(r'(web-node|web-ng)/[A-Za-z0-9_.-]+', name) or name in names
                    or member.file_size > 4*1024**3 or (member.external_attr >> 16) & 0o170000 == 0o120000):
                raise ValueError('artifact-path-or-type')
            total += member.file_size
            if total > 8*1024**3:
                raise ValueError('artifact-size-limit')
            names.add(name)
            destination = target/name
            destination.parent.mkdir(exist_ok=True)
            with archive.open(member) as source, destination.open('xb') as output:
                while block := source.read(1024*1024):
                    output.write(block)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def download(repository, artifact, token, destination):
    request = urllib.request.Request('https://api.github.com/repos/'+repository+
        '/actions/artifacts/'+str(artifact['id'])+'/zip', headers={'Authorization': 'Bearer '+token})
    try:
        urllib.request.build_opener(NoRedirect()).open(request, timeout=30)
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise
        location = error.headers['Location']
    else:
        raise ValueError('expected-signed-artifact-redirect')
    if not location.startswith('https://'):
        raise ValueError('artifact-download-must-be-https')
    # The GitHub bearer is NOT forwarded to the blob-storage redirect.
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(location, timeout=120) as source, destination.open('xb') as output:
        while block := source.read(1024*1024):
            size += len(block)
            if size > 4*1024**3:
                raise ValueError('download-size-limit')
            digest.update(block)
            output.write(block)
    if artifact.get('digest') != 'sha256:'+digest.hexdigest():
        raise ValueError('github-artifact-digest-mismatch')


def deliver(repository, run_id, sha, settings_path):
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository) or not run_id.isdigit() or not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('invalid-ci-identity')
    token = os.environ['GH_TOKEN']
    run = api(repository, '/actions/runs/'+run_id, token)
    if not eligible(run, repository, sha):
        raise ValueError('only-successful-preview-push-ci')
    if api(repository, '/git/ref/heads/preview', token)['object']['sha'] != sha:
        raise ValueError('superseded-preview-revision')
    jobs = []
    for page in range(1, 101):
        batch = api(repository, '/actions/runs/'+run_id+'/jobs?filter=latest&per_page=100&page='+str(page), token)['jobs']
        jobs.extend(batch)
        if len(batch) < 100:
            break
    gates = [job for job in jobs if job['name'] == 'Required gate']
    if len(gates) != 1 or gates[0]['conclusion'] != 'success':
        raise ValueError('exact-run-required-gate-not-green')
    settings = json.loads(settings_path.read_text(encoding='utf-8-sig'))
    if set(settings) != {'profilePath', 'workDirectory'}:
        raise ValueError('delivery-settings-fields')
    root = Path(settings['workDirectory'])/('ci-'+run_id+'-'+uuid.uuid4().hex)
    root.mkdir(parents=True)
    artifacts = api(repository, '/actions/runs/'+run_id+'/artifacts?per_page=100', token)['artifacts']
    inputs = {}
    for role, name in (('web-node', 'deployment-nest-staging'), ('web-ng', 'deployment-angular-staging')):
        matches = [item for item in artifacts if item['name'] == name and not item['expired']]
        if len(matches) != 1:
            raise ValueError('missing-verified-image-artifact')
        archive, target = root/(role+'.zip'), root/role
        download(repository, matches[0], token, archive)
        unpack(archive, target)
        inputs[role] = target/role
    bundle = root/'bundle'
    manifest = rollout.prepare(Path(settings['profilePath']), inputs, sha, bundle)
    profile = rollout.profile(bundle/'profile.json')
    digest = hashlib.sha256((bundle/'rollout.json').read_bytes()).hexdigest()
    archive = root/'upload.tar'
    with tarfile.open(archive, 'w') as output:
        for name in [*manifest['files'], 'rollout.json']:
            output.add(bundle/name, arcname=name, recursive=False)
    ssh = ['ssh', '-T', *rollout.SSH_OPTIONS, '-o', 'BatchMode=yes', profile['sshHost']]
    with archive.open('rb') as source:
        subprocess.run([*ssh, 'upload '+manifest['runId']+' '+digest], stdin=source, check=True, timeout=900)
    # Recheck branch immediately before mutation; no stale automatic delivery.
    if api(repository, '/git/ref/heads/preview', token)['object']['sha'] != sha:
        raise ValueError('preview-moved-before-deploy')
    subprocess.run([*ssh, 'deploy '+manifest['runId']+' '+digest], check=True, timeout=900)
    print(json.dumps(dict(status='passed', runId=manifest['runId'], webRevision=sha,
                          roles=manifest['roles'], localEvidence=str(root))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('repository', 'run-id', 'sha', 'settings'):
        parser.add_argument('--'+name, required=True)
    args = parser.parse_args()
    try:
        deliver(args.repository, args.run_id, args.sha, Path(args.settings))
    except Exception as error:
        print(json.dumps(dict(status='failed', errorType=type(error).__name__,
                              detail='Preserve CI and rollout reports; no automatic retry or rollback.')))
        raise SystemExit(1) from None
