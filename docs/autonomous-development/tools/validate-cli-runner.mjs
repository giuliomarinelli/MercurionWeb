#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, '../../..');
const errors = [];

const paths = {
  agents: {
    coordinator: '.github/agents/development-session-coordinator.agent.md',
    worker: '.github/agents/development-task-worker.agent.md',
  },
  mcp: '.github/mcp.json',
  vscodeMcp: '.vscode/mcp.json',
  vscodeSettings: '.vscode/settings.json',
  activeSession: 'docs/autonomous-development/session.overnight-2026-09-01.yaml',
  exampleSession: 'docs/autonomous-development/session.example.yaml',
};

const controlPlaneFiles = [
  'AGENTS.md',
  paths.agents.coordinator,
  paths.agents.worker,
  'docs/autonomous-development/README.md',
  'docs/autonomous-development/PROTOCOL.md',
  'docs/autonomous-development/LAUNCH.md',
  paths.activeSession,
  paths.exampleSession,
];

const allowedChangedFiles = new Set([
  ...controlPlaneFiles,
  '.github/mcp.json',
  '.vscode/settings.json',
  'docs/autonomous-development/tools/validate-cli-runner.mjs',
]);

function fail(target, message) {
  errors.push(`${target}: ${message}`);
}

function read(relativePath) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(relativePath, 'missing required file');
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireMatch(target, content, pattern, message) {
  if (!pattern.test(content)) fail(target, message);
}

function frontmatter(relativePath) {
  const content = read(relativePath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(relativePath, 'missing valid YAML frontmatter delimiters');
    return { content, yaml: '' };
  }
  return { content, yaml: match[1] };
}

function validateYamlStructure(target, content) {
  const stack = [{ indent: -2, keys: new Set() }];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (line.includes('\t')) {
      fail(target, `line ${index + 1} contains a tab`);
      continue;
    }

    const indent = line.length - line.trimStart().length;
    if (indent % 2 !== 0) {
      fail(target, `line ${index + 1} has non-two-space indentation`);
    }

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1);
    if (indent > parent.indent + 2) {
      fail(target, `line ${index + 1} skips an indentation level`);
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (trimmed.length === 2) fail(target, `line ${index + 1} has an empty list item`);
      continue;
    }

    const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+):(?:\s+(.*))?$/);
    if (!keyMatch) {
      fail(target, `line ${index + 1} is not a supported YAML mapping or list entry`);
      continue;
    }

    const [, key, value] = keyMatch;
    if (parent.keys.has(key)) {
      fail(target, `line ${index + 1} duplicates key ${key}`);
    }
    parent.keys.add(key);
    if (value === undefined || value === '') {
      stack.push({ indent, keys: new Set() });
    }
  }
}

for (const relativePath of controlPlaneFiles) {
  const content = read(relativePath);
  const stalePatterns = [
    [/target:\s*vscode/i, 'contains stale target: vscode'],
    [/agent\/runSubagent/i, 'contains stale agent/runSubagent invocation'],
    [/advanced_autopilot_required:\s*true/i, 'still requires the retired advanced mode'],
    [/Advanced Autopilot/i, 'contains a stale Advanced Autopilot reference'],
    [/chat\.autopilot\.advanced\.enabled/i, 'contains the removed workspace advanced-mode setting'],
    [/\.vscode\/mcp\.json/i, 'actively references the VS Code MCP file'],
    [/^\s*host:\s*vscode\s*$/im, 'contains stale VS Code host configuration'],
  ];
  for (const [pattern, message] of stalePatterns) {
    if (pattern.test(content)) fail(relativePath, message);
  }
}

const coordinator = frontmatter(paths.agents.coordinator);
const worker = frontmatter(paths.agents.worker);

for (const [role, profile] of Object.entries({ coordinator, worker })) {
  const target = paths.agents[role];
  validateYamlStructure(`${target} frontmatter`, profile.yaml);
  requireMatch(target, profile.yaml, /^description:\s*\S.+$/m, 'frontmatter requires description');
  requireMatch(target, profile.yaml, /^tools:\s*\["\*"\]\s*$/m, 'frontmatter must allow all tools');
  requireMatch(
    target,
    profile.yaml,
    /^disable-model-invocation:\s*true\s*$/m,
    'frontmatter must disable inferred invocation',
  );
  if (/^(?:target|model|argument-hint|handoffs):/m.test(profile.yaml)) {
    fail(target, 'contains unsupported or pinned frontmatter metadata');
  }
}

requireMatch(
  paths.agents.coordinator,
  coordinator.yaml,
  /^name:\s*Development Session Coordinator\s*$/m,
  'coordinator frontmatter has the wrong name',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.yaml,
  /^user-invocable:\s*true\s*$/m,
  'coordinator must be manually invocable',
);
requireMatch(
  paths.agents.worker,
  worker.yaml,
  /^name:\s*Development Task Worker\s*$/m,
  'worker frontmatter has the wrong name',
);
requireMatch(
  paths.agents.worker,
  worker.yaml,
  /^user-invocable:\s*false\s*$/m,
  'worker must not be user-invocable',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /`task` tool exactly once[\s\S]*`agent_type: Development Task Worker`[\s\S]*`mode: sync`/,
  'coordinator must require one synchronous Development Task Worker task call',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /Never run two implementation workers concurrently/,
  'coordinator must prohibit concurrent workers',
);

const activeSession = read(paths.activeSession);
const exampleSession = read(paths.exampleSession);
for (const [target, content] of [
  [paths.activeSession, activeSession],
  [paths.exampleSession, exampleSession],
]) {
  validateYamlStructure(target, content);
  requireMatch(target, content, /^\s*host:\s*github-copilot-cli\s*$/m, 'missing CLI host');
  requireMatch(target, content, /^\s*harness:\s*github-copilot-cli\s*$/m, 'missing CLI harness');
  requireMatch(target, content, /^\s*mode:\s*autopilot\s*$/m, 'missing Autopilot mode');
  requireMatch(
    target,
    content,
    /^\s*advanced_autopilot_required:\s*false\s*$/m,
    'advanced mode must not be required',
  );
  requireMatch(target, content, /^\s*invocation:\s*task\s*$/m, 'worker must use task');
  requireMatch(target, content, /^\s*tool:\s*task\s*$/m, 'subagent capability must use task');
  requireMatch(target, content, /^\s*mode:\s*sync\s*$/m, 'task invocation must be synchronous');
  requireMatch(
    target,
    content,
    /strategy:\s*native-compaction-and-checkpoints/,
    'missing CLI native context management',
  );
  requireMatch(target, content, /mcp_config:\s*\.github\/mcp\.json/, 'missing CLI MCP path');
  requireMatch(
    target,
    content,
    /terminal_outcomes_immutable_within_active_session:\s*true/,
    'missing terminal-state invariant',
  );
  requireMatch(target, content, /tool:\s*task_complete/, 'missing task_complete capability');
  requireMatch(target, content, /call_task_complete:\s*true/, 'missing final task_complete call');
  requireMatch(
    target,
    content,
    /require_effective_repository_local_commit_gpg_sign:\s*true/,
    'missing required repository-local signing check',
  );
  requireMatch(
    target,
    content,
    /required_repository_local_commit_gpg_sign_value:\s*false/,
    'repository-local signing value must be false',
  );
  if (/^\s+(?:model|reasoning):/m.test(content)) {
    fail(target, 'must inherit rather than pin model or reasoning');
  }
}

const deadline = '2026-09-02T10:00:00+02:00';
const deadlineMatches = activeSession.match(
  /^\s*end:\s*"2026-09-02T10:00:00\+02:00"/gm,
);
if (deadlineMatches?.length !== 1) {
  fail(paths.activeSession, `deadline must remain exactly ${deadline}`);
}

let mcp;
try {
  mcp = JSON.parse(read(paths.mcp));
} catch (error) {
  fail(paths.mcp, `invalid JSON: ${error.message}`);
}
if (mcp) {
  if (Object.keys(mcp).length !== 1 || !mcp.mcpServers) {
    fail(paths.mcp, 'top-level schema must contain only mcpServers');
  }
  const chrome = mcp.mcpServers?.['chrome-devtools'];
  const expectedArgs = [
    '-y',
    'chrome-devtools-mcp@1.8.0',
    '--headless',
    '--isolated',
  ];
  if (
    !chrome ||
    chrome.type !== 'local' ||
    chrome.command !== 'npx' ||
    JSON.stringify(chrome.args) !== JSON.stringify(expectedArgs)
  ) {
    fail(paths.mcp, 'chrome-devtools must use the pinned CLI local command and arguments');
  }
}

for (const target of [paths.vscodeMcp, paths.vscodeSettings]) {
  try {
    JSON.parse(read(target));
  } catch (error) {
    fail(target, `invalid JSON: ${error.message}`);
  }
}

try {
  const settings = JSON.parse(read(paths.vscodeSettings));
  if (settings['github.copilot.chat.responsesApiContextManagement.enabled'] !== true) {
    fail(paths.vscodeSettings, 'ordinary VS Code Responses context management must remain enabled');
  }
  if ('chat.autopilot.advanced.enabled' in settings) {
    fail(paths.vscodeSettings, 'workspace advanced-mode setting must be removed');
  }
} catch {
  // The JSON parse failure is reported above.
}

try {
  const vscodeMcp = JSON.parse(read(paths.vscodeMcp));
  const chrome = vscodeMcp.servers?.['chrome-devtools'];
  if (
    !chrome ||
    chrome.type !== 'stdio' ||
    chrome.command !== 'npx' ||
    JSON.stringify(chrome.args) !==
      JSON.stringify(['-y', 'chrome-devtools-mcp@1.8.0', '--headless', '--isolated'])
  ) {
    fail(paths.vscodeMcp, 'ordinary VS Code chrome-devtools configuration changed');
  }
} catch {
  // The JSON parse failure is reported above.
}

const invariantFiles = [
  'AGENTS.md',
  paths.agents.coordinator,
  'docs/autonomous-development/PROTOCOL.md',
];
for (const target of invariantFiles) {
  const content = read(target);
  for (const state of ['DONE', 'BLOCKED', 'REVERTED', 'SKIPPED_DEPENDENCY']) {
    requireMatch(target, content, new RegExp(`\\b${state}\\b`), `missing ${state} invariant`);
  }
  requireMatch(target, content, /terminal/i, 'missing terminal-state language');
  requireMatch(target, content, /new or restarted session/i, 'missing re-enablement boundary');
  requireMatch(
    target,
    content,
    /Autopilot continuation is not human authorization/i,
    'missing Autopilot non-authorization invariant',
  );
  requireMatch(target, content, /task_complete/, 'missing task_complete finalization');
}

for (const target of [paths.agents.coordinator, 'docs/autonomous-development/PROTOCOL.md']) {
  const content = read(target);
  requireMatch(target, content, /npm init -y/, 'missing real npm init probe');
  requireMatch(
    target,
    content,
    /npm install --ignore-scripts --no-save is-number@7\.0\.0/,
    'missing pinned real npm install probe',
  );
  requireMatch(
    target,
    content,
    /require\("is-number"\)\(42\).*true/,
    'missing Node.js probe assertion',
  );
  requireMatch(target, content, /commit\.gpgSign.*false/, 'missing repository signing check');
  requireMatch(target, content, /--no-gpg-sign/, 'missing per-command signing override');
}

try {
  const changed = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    { cwd: repositoryRoot, encoding: 'utf8' },
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, '/'));
  for (const relativePath of changed) {
    if (!allowedChangedFiles.has(relativePath)) {
      fail(relativePath, 'changed file is outside the CLI control-plane migration');
    }
  }
} catch (error) {
  fail('git status', error.message);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`CLI runner validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(
    'CLI runner validation passed: JSON, YAML structure, agent frontmatter, task delegation, MCP, deadline, terminal states, startup probe, signing, and change scope are valid.',
  );
}
