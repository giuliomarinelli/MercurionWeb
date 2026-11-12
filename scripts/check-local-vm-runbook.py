"""Static, offline checks for the human VM runbook. Never runs deployment commands."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs/infrastructure/local-vm'
NAMES = ('RUNBOOK.md', 'ARTIFACT-REPRODUCTION.md', 'VERIFICATION-PROCEDURE.md',
         'EXECUTION-RECORD.md', 'CONTINUITY.md', 'README.md', 'MEILISEARCH-OPERATIONS.md', 'COLD-RECOVERY.md')
errors = []
blocks = 0
for name in NAMES:
    text = (DOCS / name).read_text(encoding='utf-8')
    if text.count('```') % 2:
        errors.append(name + ': unbalanced fenced blocks')
    prose = re.sub(r'```[^\n]*\n.*?```', '', text, flags=re.S)
    for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)', prose):
        if re.match(r'^[a-z]+://', link):
            continue
        path = link.split('#')[0]
        if path and not (DOCS / path).resolve().exists():
            errors.append(name + ': missing local link ' + path)
    for language, code in re.findall(r'```([^\n]*)\n(.*?)```', text, flags=re.S):
        blocks += 1
        if language.strip() == 'powershell':
            if '.codex/artifacts' in code and re.search(r'\.py\b|\.ps1\b', code) and re.search(r'(?m)^\s*(?:python|powershell).*\.codex/artifacts', code):
                errors.append(name + ': executable recipe depends on a session-local script')
            # Quoted paths passed to Join-Path $taskToxSource belong to the
            # independent materialized repository, not this Web checkout.
            for script in re.findall(r'''(?<!['"])\bscripts/[A-Za-z0-9_./-]+\.(?:py|ps1|mjs|cjs)''', code):
                if not (ROOT / script).is_file():
                    errors.append(name + ': missing executable ' + script)
for relative in ('scripts/infrastructure/Invoke-PreviewMeiliLogIndexes.ps1',
                 'scripts/infrastructure/Invoke-PreviewMeiliClientKeys.ps1',
                 'scripts/infrastructure/reproduce_preview_artifacts.py'):
    if not (ROOT / relative).is_file():
        errors.append('Missing operator source: ' + relative)
if errors:
    raise SystemExit('\n'.join(errors))
print(f'VM runbook static checks passed: {len(NAMES)} documents, {blocks} fenced blocks; no runtime commands executed.')
