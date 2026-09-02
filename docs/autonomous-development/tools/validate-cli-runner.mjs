#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
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
  historicalSession: 'docs/autonomous-development/session.overnight-2026-09-01.yaml',
  activeSession: 'docs/autonomous-development/session.overnight-2026-09-02.yaml',
  exampleSession: 'docs/autonomous-development/session.example.yaml',
  activeLaunch: 'docs/autonomous-development/LAUNCH-2026-09-02.md',
};

const expectedAgentTools = {
  coordinator:
    'tools: ["execute", "read", "edit", "search", "web", "todo", "task", "task_complete", "chrome-devtools/*"]',
  worker:
    'tools: ["execute", "read", "edit", "search", "web", "todo", "chrome-devtools/*"]',
};

const controlPlaneFiles = [
  'AGENTS.md',
  paths.agents.coordinator,
  paths.agents.worker,
  'docs/autonomous-development/README.md',
  'docs/autonomous-development/CI-BASELINE.md',
  'docs/autonomous-development/PROTOCOL.md',
  'docs/autonomous-development/LAUNCH.md',
  paths.activeLaunch,
  paths.activeSession,
  paths.exampleSession,
];

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
    [
      /agent_type:\s*Development Task Worker/,
      'contains display-name agent_type instead of development-task-worker',
    ],
    [/advanced_autopilot_required:/i, 'contains the retired advanced-mode key'],
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
  const toolsLine = profile.yaml
    .split(/\r?\n/)
    .find((line) => line.startsWith('tools:'));
  if (toolsLine !== expectedAgentTools[role]) {
    fail(target, `frontmatter tools must equal ${expectedAgentTools[role]}`);
  }
  if (/^tools:\s*\["\*"\]\s*$/m.test(profile.yaml)) {
    fail(target, 'must not inherit every unrelated user-scoped tool schema');
  }
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
  paths.agents.coordinator,
  coordinator.yaml,
  /^disable-model-invocation:\s*true\s*$/m,
  'coordinator must disable inferred invocation',
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
  paths.agents.worker,
  worker.yaml,
  /^disable-model-invocation:\s*false\s*$/m,
  'worker must remain available for programmatic task invocation',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /`task` tool exactly once[\s\S]*`agent_type: development-task-worker`[\s\S]*`mode: sync`/,
  'coordinator must require one synchronous Development Task Worker task call',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /Never run two implementation workers concurrently/,
  'coordinator must prohibit concurrent workers',
);
for (const [target, content] of [
  [paths.agents.coordinator, coordinator.content],
  [paths.agents.worker, worker.content],
]) {
  requireMatch(target, content, /capability_probe: true/, 'missing non-mutating task handshake');
  requireMatch(
    target,
    content,
    /TASK_CAPABILITY_OK <nonce>/,
    'missing nonce-correlated task handshake response',
  );
}
requireMatch(
  paths.agents.worker,
  worker.content,
  /do not read repository files, invoke tools, run commands, inspect or modify Git/,
  'worker capability probe must forbid repository and tool access',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /emit the concise final summary and report path, then call `task_complete` as the final Autopilot action/,
  'coordinator must summarize before the final task_complete action',
);

const historicalSession = read(paths.historicalSession);
const activeSession = read(paths.activeSession);
const exampleSession = read(paths.exampleSession);
for (const [target, content] of [
  [paths.exampleSession, exampleSession],
  [paths.activeSession, activeSession],
]) {
  validateYamlStructure(target, content);
  requireMatch(target, content, /^\s*host:\s*github-copilot-cli\s*$/m, 'missing CLI host');
  requireMatch(target, content, /^\s*harness:\s*github-copilot-cli\s*$/m, 'missing CLI harness');
  requireMatch(target, content, /^\s*mode:\s*autopilot\s*$/m, 'missing Autopilot mode');
  requireMatch(target, content, /^\s*invocation:\s*task\s*$/m, 'worker must use task');
  requireMatch(target, content, /^\s*tool:\s*task\s*$/m, 'subagent capability must use task');
  requireMatch(target, content, /^\s*mode:\s*sync\s*$/m, 'task invocation must be synchronous');
  const agentTypeMatches = content.match(
    /^\s*agent_type:\s*development-task-worker\s*$/gm,
  );
  if (agentTypeMatches?.length !== 3) {
    fail(target, 'must declare development-task-worker for worker, capability, and probe');
  }
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
    /emit_final_summary_and_report_path_before_task_complete:\s*true/,
    'final summary must precede task_complete',
  );
  requireMatch(
    target,
    content,
    /task_complete_is_final_autopilot_action:\s*true/,
    'task_complete must be the final Autopilot action',
  );
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
  requireMatch(
    target,
    content,
    /before_task_branch_creation:\s*true/,
    'task handshake must run before branch creation',
  );
  requireMatch(
    target,
    content,
    /expected_response:\s*"TASK_CAPABILITY_OK \{nonce\}"/,
    'missing exact nonce-correlated handshake response',
  );
  requireMatch(
    target,
    content,
    /worker_tool_calls_allowed:\s*false/,
    'capability probe must forbid worker tool calls',
  );
  requireMatch(
    target,
    content,
    /repository_access_allowed:\s*false/,
    'capability probe must forbid repository access',
  );
  if (/^\s+(?:model|reasoning):/m.test(content)) {
    fail(target, 'must inherit rather than pin model or reasoning');
  }
}

requireMatch(
  paths.historicalSession,
  historicalSession,
  /^\s*historical_configuration_pull_request:\s*25\s*$/m,
  'PR #25 must be retained as historical provenance',
);
requireMatch(
  paths.historicalSession,
  historicalSession,
  /^\s*historical_configuration_pull_request_state:\s*merged\s*$/m,
  'PR #25 must be recorded as merged',
);
requireMatch(
  paths.historicalSession,
  historicalSession,
  /^\s*require_current_cli_runner_control_plane_on_integration_branch:\s*true\s*$/m,
  'current CLI control plane must be required on develop',
);

const launch = read('docs/autonomous-development/LAUNCH.md');
for (const [pattern, message] of [
  [/## Do not launch yet/i, 'contains the obsolete pre-merge launch heading'],
  [/PR `?#25`?.*remains draft/i, 'still describes PR #25 as draft'],
  [/Merge PR `?#25`? manually/i, 'still asks the user to merge PR #25'],
]) {
  if (pattern.test(launch)) fail('docs/autonomous-development/LAUNCH.md', message);
}
requireMatch(
  'docs/autonomous-development/LAUNCH.md',
  launch,
  /copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir \.\.\/MercurionTox21 --reasoning-effort high --autopilot/,
  'missing deterministic Copilot CLI launch command',
);
if (/--allow-all-paths/.test(launch)) {
  fail('docs/autonomous-development/LAUNCH.md', 'must not disable all path verification');
}
for (const command of ['/model', '/permissions show', '/mcp list', '/keep-alive on']) {
  requireMatch(
    'docs/autonomous-development/LAUNCH.md',
    launch,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `missing ${command} pre-launch verification`,
  );
}

const activeLaunch = read(paths.activeLaunch);
requireMatch(
  paths.activeLaunch,
  activeLaunch,
  /docs\/autonomous-development\/session\.overnight-2026-09-02\.yaml/,
  'active launch must reference the active dated session configuration',
);
requireMatch(
  paths.activeLaunch,
  activeLaunch,
  /copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir \.\.\/MercurionTox21 --reasoning-effort high --autopilot/,
  'active launch is missing the deterministic Copilot CLI command',
);
requireMatch(
  paths.activeLaunch,
  activeLaunch,
  /2026-09-03T10:00:00\+02:00/,
  'active launch is missing the exact soft deadline',
);
requireMatch(
  paths.activeLaunch,
  activeLaunch,
  /archive\/SYS-001-attempt-2026-09-01/,
  'active launch must record the archived SYS-001 attempt',
);
for (const command of ['/model', '/permissions show', '/mcp list', '/keep-alive on']) {
  requireMatch(
    paths.activeLaunch,
    activeLaunch,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `active launch is missing ${command}`,
  );
}

const deadline = '2026-09-02T10:00:00+02:00';
const deadlineMatches = historicalSession.match(
  /^\s*end:\s*"2026-09-02T10:00:00\+02:00"/gm,
);
if (deadlineMatches?.length !== 1) {
  fail(paths.historicalSession, `deadline must remain exactly ${deadline}`);
}

const activeDeadline = '2026-09-03T10:00:00+02:00';
const activeDeadlineMatches = activeSession.match(
  /^\s*end:\s*"2026-09-03T10:00:00\+02:00"/gm,
);
if (activeDeadlineMatches?.length !== 1) {
  fail(paths.activeSession, `deadline must remain exactly ${activeDeadline}`);
}

for (const [pattern, message] of [
  [/^repository:\s*$/m, 'missing repository mapping'],
  [/wait_for_feature_ci:\s*true/, 'missing feature CI wait policy'],
  [/require_exact_sha_ci_for_every_develop_base:\s*true/, 'missing exact-SHA baseline policy'],
  [/numbered_tasks_may_repair_baseline:\s*false/, 'numbered tasks must not repair baseline debt'],
  [/wait_for_exact_feature_sha:\s*true/, 'missing exact feature-SHA CI requirement'],
  [/required_check:\s*Required gate/, 'missing stable Required gate contract'],
  [/ubuntu-latest[\s\S]*windows-latest/, 'missing Windows/Linux CI platforms'],
  [/expected_first_task:\s*"0001"/, 'active workload must begin at task 0001'],
  [/expected_task_count:\s*220/, 'active workload must contain 220 tasks'],
  [/sys_001_previous_attempt_branch:\s*archive\/SYS-001-attempt-2026-09-01/, 'missing archived retry branch decision'],
]) {
  requireMatch(paths.activeSession, activeSession, pattern, message);
}

for (const stalePattern of [
  /allow_task_0001_phase_0_bootstrap_only/,
  /repair_repository_controlled_failures/,
  /bootstrap_until_task/,
  /require_exact_sha_ci_for_later_develop_bases/,
]) {
  if (stalePattern.test(activeSession)) {
    fail(paths.activeSession, `contains retired Phase 0 policy ${stalePattern.source}`);
  }
}

for (const [pattern, message] of [
  [/baseline_document:\s*docs\/autonomous-development\/CI-BASELINE\.md/, 'missing permanent baseline document'],
  [/numbered_tasks_may_repair_baseline:\s*false/, 'numbered tasks must not repair baseline debt'],
  [/wait_for_exact_feature_sha:\s*true/, 'missing exact feature-SHA CI requirement'],
  [/required_check:\s*Required gate/, 'missing stable Required gate contract'],
  [/ubuntu-latest[\s\S]*windows-latest/, 'missing Windows/Linux CI platforms'],
]) {
  requireMatch(paths.exampleSession, exampleSession, pattern, message);
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

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`CLI runner validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log(
    'CLI runner validation passed: JSON, YAML structure, explicit agent tools, slugged task delegation, non-mutating handshake, MCP, historical and active launch records, permanent CI baseline, terminal states, startup probe, signing, and finalization order are valid.',
  );
}
