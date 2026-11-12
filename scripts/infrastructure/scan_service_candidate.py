"""Scan one immutable local candidate; does not start servers or authorize adoption."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re

import audit_development_services as audit


def scan(image, role, output, context='desktop-linux'):
    if role not in audit.ROLES or not re.fullmatch(r'sha256:[a-f0-9]{64}', image):
        raise ValueError('Known role and immutable local image ID required')
    output.mkdir(parents=True, exist_ok=False)
    raw = json.loads(audit.command(context, 'image', 'inspect', image))[0]
    if raw['Id'] != image or (raw['Os'], raw['Architecture']) != ('linux', 'amd64'):
        raise ValueError('Candidate platform or identity mismatch')
    audit.command(context, 'save', '--output', str(output/'image.tar'), image)
    digest, _ = audit.exporter.web.delivery.archive_config(output/'image.tar')
    database = audit.exporter.web.scan_archive(output, output/'cache', ('docker', '--context', context))
    summary = audit.exporter.web.delivery.security_summary(
        json.loads((output/'vulnerabilities.json').read_text(encoding='utf-8')), digest)
    (output/'policy-result.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    result = dict(schemaVersion=1, role=role, imageId=image, configDigest=digest,
                  observedAtUtc=datetime.now(timezone.utc).isoformat(),
                  scanner=audit.exporter.web.SCANNER, scannerDatabase=database,
                  securityEligible=summary['eligible'], counts=summary['counts'],
                  archiveSha256=audit.exporter.web.delivery.checksum(output/'image.tar'),
                  compatibilityVerified=False, adoptionAuthorized=False, vmChanged=False)
    (output/'candidate.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--role', required=True, choices=audit.ROLES)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--context', default='desktop-linux')
    args = parser.parse_args()
    result = scan(args.image, args.role, args.output.resolve(), args.context)
    print(json.dumps(result))
    raise SystemExit(0 if result['securityEligible'] else 2)
