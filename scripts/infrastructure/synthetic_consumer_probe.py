"""One-shot consumer of synthetic credentials; output is strictly metadata-only."""
import argparse
import errno
import json
import os
import re
import sys
import uuid

sys.path.insert(0, '/fixture')
from secret_bootstrap import SecretBootstrapError, load_secret_file_environment


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id',required=True)
    parser.add_argument('--case',choices=('read','unauthorized','missing','wrong-environment'),required=True)
    args=parser.parse_args()
    if not re.fullmatch('[a-f0-9]{32}',args.run_id):
        return 2
    result=dict(schemaVersion=1,runId=args.run_id,case=args.case,uid=os.getuid(),
                invocationId=uuid.uuid4().hex,outcome='invalid')
    target=dict(PY_ENV='production' if args.case=='wrong-environment' else 'staging',
                MERCURION_BOOTSTRAP_FILE='/run/bootstrap.json')
    try:
        load_secret_file_environment(target)
        if (args.case=='read' and os.getuid()==10021
                and target.get('NATS_USERNAME')=='synthetic-tox21-'+args.run_id
                and re.fullmatch('synthetic-only-[a-f0-9]{32}',target.get('NATS_PASSWORD',''))):
            try:
                os.chmod('/run/bootstrap.json',0o600)
            except OSError as error:
                if error.errno==errno.EROFS:
                    result['outcome']='loaded-readonly'
    except SecretBootstrapError as error:
        expected='environment-mismatch' if args.case=='wrong-environment' else 'file-unreadable'
        if args.case!='read' and error.reason==expected:
            result['outcome']='blocked'
    except Exception:
        pass  # Never print credential values, exception arguments or hashes.
    print(json.dumps(result))
    return 0 if result['outcome']!='invalid' else 2


if __name__=='__main__':
    raise SystemExit(main())
