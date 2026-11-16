"""Retire only a completed synthetic preview pilot selected by its local owner receipt."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys

import synthetic_secret_delivery as transport

LEGACY_HELPER = '95819d5c7f12731aba6b94bc5f870984b091cd88fee69df6d18c87c0b4d10024'
DELIVERY_PHASES = ['staged', 'prepared', 'received', 'applied', 'active', 'code-removed']


def build_plan(identifier, evidence, helper=None):
    if not re.fullmatch('[a-f0-9]{32}', identifier):
        raise ValueError('run-id')
    source = helper if helper is not None else Path(__file__).with_name('secret_delivery.py').read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if not 0 < len(source) <= transport.CODE_LIMIT:
        raise ValueError('helper-size')
    if not isinstance(evidence, dict):
        raise ValueError('receipt-file')
    doc = evidence.get('receipt')
    fields = {'schemaVersion', 'runId', 'environment', 'consumer', 'helperSha256', 'phases',
              'syntheticOnly', 'servicesStarted', 'isolationAccepted'}
    if (not isinstance(doc, dict) or set(doc) != fields or type(doc['schemaVersion']) is not int
            or doc['schemaVersion'] != 1 or doc['runId'] != identifier or doc['environment'] != 'preview'
            or doc['consumer'] != 'tox21' or doc['phases'] != DELIVERY_PHASES
            or doc['helperSha256'] not in (LEGACY_HELPER, digest)
            or doc['syntheticOnly'] is not True or doc['servicesStarted'] is not False
            or doc['isolationAccepted'] is not False or evidence.get('localHelperHashMatches') is not True):
        raise ValueError('completed-synthetic-receipt-required')
    steps = [transport.Step('staged', transport.remote(transport.STAGE, identifier, digest), data=source),
             transport.Step('retired', transport.remote(transport.LOAD, identifier, digest, 'retire', 'preview', sudo=True), interactive=True),
             transport.Step('retirement-verified', transport.remote(transport.LOAD, identifier, digest, 'inspect-retired', 'preview')),
             transport.Step('code-removed', transport.remote(transport.CLEANUP, identifier))]
    return transport.Plan(identifier, 'preview', digest, steps)


def load_evidence(identifier):
    if not re.fullmatch('[a-f0-9]{32}', identifier):
        raise ValueError('run-id')
    path = Path.home()/'.codex/artifacts/inf-vm-04'/identifier/'operator-receipt.json'
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode) or metadata.st_nlink != 1 or not 0 < metadata.st_size <= 16384:
        raise ValueError('receipt-file')
    evidence = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(evidence, dict):
        raise ValueError('receipt-file')
    return evidence


def execute(plan, invoke=transport.transport, progress=None):
    phases = []
    state = None
    for step in plan.steps:
        if progress:
            progress(step.phase)
        code, output = invoke(step)
        if code:
            raise ValueError('phase-failed')
        if not step.interactive:
            if output is None or len(output) > 4096:
                raise ValueError('receipt')
            doc = json.loads(output)
            fields = {'schemaVersion', 'runId', 'phase'}
            if step.phase == 'retirement-verified':
                fields |= {'consumer', 'servicesStarted', 'isolationAccepted', 'state'}
            if (not isinstance(doc, dict) or set(doc) != fields or type(doc['schemaVersion']) is not int
                    or doc['schemaVersion'] != 1 or doc['runId'] != plan.run_id or doc['phase'] != step.phase):
                raise ValueError('receipt')
            if step.phase == 'retirement-verified':
                if (doc['consumer'] != 'tox21' or doc['servicesStarted'] is not False
                        or doc['isolationAccepted'] is not False or doc['state'] not in ('retired', 'absent')):
                    raise ValueError('receipt')
                state = doc['state']
        phases.append(step.phase)
    return dict(schemaVersion=1, runId=plan.run_id, environment='preview', consumer='tox21',
                maintenanceHelperSha256=plan.helper_sha256, phases=phases, state=state,
                valuesAbsent=True, codeRemoved=True, syntheticOnly=True,
                servicesStarted=False, isolationAccepted=False)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--execute', action='store_true')
    args = parser.parse_args(argv)
    try:
        plan = build_plan(args.run_id, load_evidence(args.run_id))
        if not args.execute:
            print(json.dumps(dict(runId=plan.run_id, environment=plan.environment,
                                  phases=[step.phase for step in plan.steps],
                                  syntheticOnly=True, executionRequested=False)))
            return 0
        if os.name != 'nt':
            raise ValueError('windows-host-required')
        print(json.dumps(dict(runId=plan.run_id, environment='preview')), flush=True)
        result = execute(plan, progress=lambda phase: print('Fase: '+phase, flush=True))
        print(json.dumps(result))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        print(json.dumps(dict(code='SYNTHETIC_RETIREMENT_FAILED',
                              detail='Preserve run and last phase; no automatic retry or broad cleanup')),
              file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
