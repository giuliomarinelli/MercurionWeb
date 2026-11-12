"""Extend the existing synthetic three-server smoke with real persistence-marker checks.

Arguments and selective cleanup are owned by smoke_preview_infrastructure.
Only already-local images and synthetic credentials are used; no VM access.
"""
import inspect
import json
from pathlib import Path

import guest_preview_cold_recovery as recovery
import smoke_preview_infrastructure as fixture

original_wait = fixture.wait


def wait_with_markers(server, command):
    result = original_wait(server, command)
    name = fixture.value('inspect', '--format', '{{.Name}}', server).lstrip('/')
    if name.endswith('-meilisearch-server'):
        prefix = name[:-len('-meilisearch-server')]
        code = 'from pathlib import Path\n' + inspect.getsource(recovery.markers)
        code += "\nassert markers({'mercurion_preview_postgres':Path('/pg/data'),'mercurion_preview_redis':Path('/redis/data'),'mercurion_shared_meili':Path('/meili/data')})\nprint('PERSISTENT_MARKERS_OK')"
        output = fixture.value('run', '--rm', '--pull', 'never', '--network', 'none', '--read-only',
            '--user', '0:0', '--cap-drop', 'ALL', '--cap-add', 'DAC_OVERRIDE', '--security-opt', 'no-new-privileges:true',
            '--memory', '128m', '--pids-limit', '64',
            '--mount', 'type=volume,src=' + prefix + '-postgres,dst=/pg,readonly',
            '--mount', 'type=volume,src=' + prefix + '-redis,dst=/redis,readonly',
            '--mount', 'type=volume,src=' + prefix + '-meilisearch,dst=/meili,readonly',
            fixture.HELPER, 'python', '-B', '-c', code)
        if output != 'PERSISTENT_MARKERS_OK':
            raise ValueError('persistence-marker-fixture')
        print(output, flush=True)
        result = json.dumps({**json.loads(result), 'persistenceMarkers': True})
    return result


if __name__ == '__main__':
    fixture.wait = wait_with_markers
    raise SystemExit(fixture.main())
