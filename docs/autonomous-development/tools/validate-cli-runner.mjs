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
  mcpLauncher: '.github/scripts/start-chrome-devtools-mcp.ps1',
  vscodeMcp: '.vscode/mcp.json',
  vscodeSettings: '.vscode/settings.json',
  historicalSession: 'docs/autonomous-development/session.overnight-2026-09-01.yaml',
  completedSession: 'docs/autonomous-development/session.48h-2026-09-03.yaml',
  exampleSession: 'docs/autonomous-development/session.example.yaml',
  closedSession: 'docs/autonomous-development/session.until-2026-09-10.yaml',
  preparedSession: 'docs/autonomous-development/session.overweek-2026-09-20-v6.yaml',
  completedLaunch: 'docs/autonomous-development/LAUNCH-2026-09-03-v2.md',
  closedLaunch: 'docs/autonomous-development/LAUNCH-2026-09-06.md',
  preparedLaunch: 'docs/autonomous-development/LAUNCH-2026-09-10-overweek-v6.md',
  runtime: 'docs/autonomous-development/RUNTIME.md',
  workflow: '.github/workflows/ci.yml',
  classifier: '.github/scripts/classify-ci.mjs',
  planner: 'docs/autonomous-development/tools/plan-dependency-graph.mjs',
  reportTemplate: 'docs/autonomous-development/reports/0000-session-report-template.md',
  routeOwnership: 'scripts/check-rest-route-ownership.mjs',
  routeOwnershipNegative: 'scripts/test-rest-route-ownership-policy-negative.mjs',
};

const expectedAgentTools = {
  coordinator:
    'tools: ["execute", "read", "edit", "search", "web", "todo", "task", "task_complete"]',
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
  paths.runtime,
  'docs/autonomous-development/LAUNCH.md',
  paths.completedLaunch,
  paths.closedLaunch,
  paths.preparedLaunch,
  paths.completedSession,
  paths.exampleSession,
  paths.closedSession,
  paths.preparedSession,
  paths.workflow,
  paths.classifier,
  paths.planner,
  paths.reportTemplate,
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
  return fs.readFileSync(absolutePath, 'utf8').replace(/\r\n?/g, '\n');
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

function validateWorkloadAllowlist(target, content) {
  const lines = content.split(/\r?\n/);
  const workloadIndex = lines.findIndex((line) => line === 'workload:');
  if (workloadIndex < 0) {
    fail(target, 'missing workload mapping');
    return;
  }

  let tasksIndex = -1;
  for (let index = workloadIndex + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z0-9_-]+:/.test(lines[index])) break;
    if (/^  tasks:/.test(lines[index])) {
      tasksIndex = index;
      break;
    }
  }
  if (tasksIndex < 0) {
    fail(target, 'missing workload.tasks selection');
    return;
  }

  const tasksValue = lines[tasksIndex].replace(/^  tasks:\s*/, '');
  if (tasksValue === '[]') return;
  if (tasksValue !== '') {
    fail(target, 'workload.tasks must be [] or a YAML list of quoted four-digit IDs');
    return;
  }

  const taskIds = [];
  for (let index = tasksIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (/^  [A-Za-z0-9_-]+:/.test(line)) break;
    const item = line.match(/^    - "([0-9]{4})"\s*$/);
    if (!item) {
      fail(target, `workload.tasks line ${index + 1} must be a quoted four-digit ID`);
      continue;
    }
    taskIds.push(item[1]);
  }

  if (taskIds.length === 0) {
    fail(target, 'expanded workload.tasks must contain at least one task ID');
  }
  const duplicates = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    fail(target, `workload.tasks contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
  }

  const taskDirectory = path.join(repositoryRoot, 'docs/autonomous-development/task');
  const knownTaskIds = new Set(
    fs.readdirSync(taskDirectory)
      .map((name) => name.match(/^([0-9]{4})-.*\.md$/)?.[1])
      .filter((id) => id && id !== '0000'),
  );
  for (const id of taskIds) {
    if (!knownTaskIds.has(id)) fail(target, `workload.tasks references unknown task ${id}`);
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
  /call the `task` tool once for the primary implementation[\s\S]*`agent_type: development-task-worker`[\s\S]*`mode: sync`/,
  'coordinator must require one synchronous primary Development Task Worker call',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /actionable repository-controlled diagnostic[\s\S]*`ci_repair: true`[\s\S]*`feature_ci_repair\.max_attempts`[\s\S]*only then apply `BLOCKED`/,
  'coordinator must repair actionable feature CI failures before BLOCKED',
);
requireMatch(
  paths.agents.worker,
  worker.content,
  /Feature-CI repair mode[\s\S]*`ci_repair: true`[\s\S]*`CI_REPAIR_READY`[\s\S]*Do not mark `BLOCKED` merely because/,
  'worker must support bounded same-task feature CI repair',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /Never run two implementation workers concurrently/,
  'coordinator must prohibit concurrent workers',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /auto-detaches[\s\S]*still-active synchronous lease[\s\S]*never dispatch another worker/,
  'coordinator must serialize a host-auto-detached synchronous worker',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /do not push an[\s\S]*unchanged branch whose head still equals[\s\S]*develop/,
  'coordinator must delay the first feature push until task-specific work exists',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /entire affected[\s\S]*transitive closure[\s\S]*one aggregate metadata-only commit/,
  'coordinator must batch terminal dependency skips',
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
  paths.agents.coordinator,
  coordinator.content,
  /SESSION_CAPABILITY_PAUSE[\s\S]*session-local capability-pause exclusion set[\s\S]*continue with the next[\s\S]*`READY` task/,
  'coordinator must defer a capability-paused task and continue with another READY task',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /do not retry the paused task in[\s\S]*this session/,
  'coordinator must prevent same-session capability-pause reselection loops',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /SESSION_BRANCH_COLLISION_PAUSE[\s\S]*branch-collision exclusion set[\s\S]*continue with the next independent `READY` task/,
  'coordinator must isolate a branch collision and continue independent work',
);
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /SESSION_RECOVERY_PENDING[\s\S]*retry[\s\S]*soft deadline/,
  'coordinator must recover from infrastructure failures without early finalization',
);
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
if (/chrome-devtools\/\*/.test(coordinator.yaml)) {
  fail(paths.agents.coordinator, 'coordinator must not own the persistent browser');
}
for (const [target, content] of [
  [paths.agents.coordinator, coordinator.content],
  [paths.agents.worker, worker.content],
]) {
  requireMatch(
    target,
    content,
    /SESSION_CAPABILITY_PAUSE/,
    'missing transient browser/runtime capability pause contract',
  );
  requireMatch(
    target,
    content,
    /BROWSER_PROFILE_RECOVERY_REQUIRED/,
    'missing dirty persistent-profile recovery contract',
  );
}
requireMatch(
  paths.agents.worker,
  worker.content,
  /before editing[\s\S]*dedicated persistent Chrome profile/,
  'worker must probe the persistent browser before implementation',
);
requireMatch(
  paths.agents.worker,
  worker.content,
  /do not use Incognito\/Guest\/isolated mode/,
  'worker must preserve the dedicated browser profile',
);
for (const [pattern, message] of [
  [/browser_profile_probe: write/, 'missing persistent-profile write probe'],
  [/browser_profile_probe: read/, 'missing persistent-profile read probe'],
  [/BROWSER_PROFILE_PROBE_WRITTEN <nonce>/, 'missing exact browser write-probe response'],
  [/BROWSER_PROFILE_PROBE_OK <nonce>/, 'missing exact browser read-probe response'],
  [/mercurion-autonomous-profile-probe/, 'missing bounded browser probe storage key'],
]) {
  requireMatch(paths.agents.worker, worker.content, pattern, message);
}

const historicalSession = read(paths.historicalSession);
const completedSession = read(paths.completedSession);
const exampleSession = read(paths.exampleSession);
const closedSession = read(paths.closedSession);
const preparedSession = read(paths.preparedSession);
for (const [target, content] of [
  [paths.exampleSession, exampleSession],
  [paths.completedSession, completedSession],
  [paths.closedSession, closedSession],
  [paths.preparedSession, preparedSession],
]) {
  validateYamlStructure(target, content);
  validateWorkloadAllowlist(target, content);
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
  requireMatch(target, content, /task_scoped:\s*true/, 'runtime must be task-scoped');
  requireMatch(
    target,
    content,
    /start_only_after_task_start_preflight:\s*true/,
    'runtime must start only after the task-start preflight',
  );
  requireMatch(
    target,
    content,
    /start_only_when_browser_validation_required:\s*true/,
    'runtime must start only when browser validation requires it',
  );
  requireMatch(
    target,
    content,
    /stop_before_(?:clean_install|task_handoff):\s*true/,
    'runtime must stop before clean-install or task handoff',
  );
  requireMatch(
    target,
    content,
    /carry_processes_between_tasks:\s*false/,
    'runtime processes must not cross task boundaries',
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

const completedLaunch = read(paths.completedLaunch);
const closedLaunch = read(paths.closedLaunch);
const preparedLaunch = read(paths.preparedLaunch);
const runtime = read(paths.runtime);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /docs\/autonomous-development\/session\.until-2026-09-10\.yaml/,
  'closed launch must retain its dated session configuration reference',
);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir \.\.\/MercurionTox21 --reasoning-effort high --autopilot/,
  'closed launch must retain the deterministic Copilot CLI command',
);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /2026-09-10T10:00:00\+02:00/,
  'closed launch must retain the exact soft deadline',
);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /npm run autonomous:plan/,
  'closed launch must retain the deterministic dependency planner',
);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /expected first task: 0010/,
  'closed launch must retain its expected first ready task',
);
requireMatch(
  paths.closedLaunch,
  closedLaunch,
  /Do[\s\S]{0,10}not bundle tasks/,
  'closed launch must retain its multi-task bundle prohibition',
);
for (const command of ['/model', '/permissions show', '/mcp list', '/keep-alive on']) {
  requireMatch(
    paths.closedLaunch,
    closedLaunch,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `closed launch must retain ${command}`,
  );
}

for (const [pattern, message] of [
  [/docs\/autonomous-development\/session\.overweek-2026-09-20-v6\.yaml/, 'prepared launch must reference its dated session configuration'],
  [/2026-09-20T10:00:00\+02:00/, 'prepared launch must retain the exact soft deadline'],
  [/test-account login policy are integrated into `develop`/i, 'prepared launch must require the shared real test-account policy'],
  [/no\s+profile-persistence or pre-authenticated-state probe is a launch prerequisite/i, 'prepared launch must not depend on persisted profile authentication'],
  [/workload\.tasks` list is empty[\s\S]{0,120}complete Series is in\s*scope/i, 'prepared launch must select the complete Series'],
  [/there is no autonomous allowlist/i, 'prepared launch must explicitly disable workload restriction'],
  [/expected first READY task[\s\S]{0,20}(?:is\s*)?0054/i, 'prepared launch must state the current expected first ready task'],
  [/Task `0041` \(`FE-019`\) is already integrated as `DONE`[\s\S]*must not attempt or re-enable it/i, 'prepared launch must retain completed FE-019'],
  [/env\/\.env\.development[\s\S]{0,260}ordinary login[\s\S]{0,260}server/i, 'prepared launch must require a fresh server-accepted real-account login'],
  [/Do[\s\S]{0,10}not bundle tasks/, 'prepared launch must prohibit multi-task bundles'],
  [/npm run autonomous:plan/, 'prepared launch must execute the deterministic planner'],
  [/copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir \.\.\/MercurionTox21 --reasoning-effort high --autopilot/, 'prepared launch is missing the deterministic Copilot CLI command'],
]) {
  requireMatch(paths.preparedLaunch, preparedLaunch, pattern, message);
}
for (const staleSessionReference of [
  'docs/autonomous-development/session.until-2026-09-12.yaml',
  'docs/autonomous-development/session.overnight-2026-09-08.yaml',
  'docs/autonomous-development/session.overweek-2026-09-16.yaml',
  'docs/autonomous-development/session.overweek-2026-09-16-v2.yaml',
  'docs/autonomous-development/session.overweek-2026-09-17-v3.yaml',
]) {
  if (preparedLaunch.includes(staleSessionReference)) {
    fail(paths.preparedLaunch, `contains stale session reference ${staleSessionReference}`);
  }
}
const preparedSessionReference =
  'docs/autonomous-development/session.overweek-2026-09-20-v6.yaml';
if (preparedLaunch.split(preparedSessionReference).length - 1 !== 2) {
  fail(paths.preparedLaunch, 'must reference the active session exactly twice');
}
for (const command of ['/model', '/permissions show', '/mcp list', '/keep-alive on']) {
  requireMatch(
    paths.preparedLaunch,
    preparedLaunch,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `prepared launch is missing ${command}`,
  );
}

for (const [pattern, message] of [
  [/Working directory:[\s\S]*\.\.\/MercurionTox21/, 'missing explicit Tox21 working directory'],
  [/(?:set\s+"PYTHONUTF8=1"|PYTHONUTF8\s*=\s*"1")/, 'missing Windows UTF-8 Tox21 environment'],
  [/(?:\.venv|\.\\\.venv)\\Scripts\\python\.exe -m main/, 'missing cwd-relative Windows Tox21 command'],
  [/must not make an application inventory stale|cannot invalidate the application baseline/i, 'missing metadata isolation rule'],
  [/\.cache\\chrome-devtools-mcp\\chrome-profile/, 'missing dedicated persistent Chrome profile path'],
  [/SESSION_CAPABILITY_PAUSE/, 'missing pre-implementation browser capability pause'],
  [/502[\s\S]{0,40}Bad\s+Gateway[\s\S]*edge-live\/upstream-unavailable/, 'runtime must classify nginx 502 as live edge with unavailable upstream'],
  [/ECONNREFUSED[\s\S]*nginx unavailability/, 'runtime must require a transport failure before classifying nginx unavailable'],
  [/up to five minutes[\s\S]*two consecutive successful complete probe rounds/i, 'runtime must wait for stable application readiness'],
  [/local npm[\s\S]*executable being unrecognized[\s\S]*BASELINE_INVARIANT_FAILURE/, 'runtime must classify missing workspace executables as a baseline failure'],
  [/must not collapse an executable-not-found error[\s\S]*"nginx unavailable"/, 'runtime must preserve actionable process diagnostics'],
  [/BROWSER_PROFILE_RECOVERY_REQUIRED/, 'missing browser state-lease recovery rule'],
  [/Never record cookie values, tokens, passwords/, 'missing browser-secret reporting prohibition'],
]) {
  requireMatch(paths.runtime, runtime, pattern, message);
}

const runtimeStartupSection = runtime.slice(runtime.indexOf('## Startup and readiness'));
const runtimeNotStartedIndex = runtimeStartupSection.indexOf(
  'Before step 1, the worker is in `RUNTIME_NOT_STARTED`',
);
const toxStartIndex = runtimeStartupSection.indexOf('1. start the Tox21 process');
const firstHttpProbeIndex = runtimeStartupSection.indexOf(
  '6. only after all three starts have returned live execution-session handles',
);
if (
  runtimeNotStartedIndex < 0 ||
  toxStartIndex < 0 ||
  firstHttpProbeIndex < 0 ||
  runtimeNotStartedIndex >= toxStartIndex ||
  toxStartIndex >= firstHttpProbeIndex
) {
  fail(paths.runtime, 'runtime must start Tox21, Nest and Angular before the first HTTP probe');
}
requireMatch(
  paths.runtime,
  runtimeStartupSection,
  /RUNTIME_NOT_STARTED[\s\S]*every[\s\S]*network request is forbidden[\s\S]*RUNTIME_STARTED[\s\S]*Only that state permits the first[\s\S]*HTTP request/,
  'runtime must enforce the no-network startup barrier',
);
requireMatch(
  paths.agents.worker,
  worker.content,
  /strict state machine[\s\S]*do not issue any HTTP request of any kind[\s\S]*first three runtime commands MUST be, in order: start Tox21, start Nest, and start Angular[\s\S]*only then begin nginx readiness requests/,
  'worker must forbid every HTTP probe before all runtime starts',
);

const preparedLaunchPrompt = preparedLaunch.slice(preparedLaunch.indexOf('## Launch prompt'));
const launchNoHttpIndex = preparedLaunchPrompt.indexOf(
  'Before runtime startup,\ndo not issue any HTTP request or edge-liveness probe',
);
const launchStartIndex = preparedLaunchPrompt.indexOf(
  'Start Tox21, Nest and Angular\nin that order',
);
const launchFirstEdgeClassificationIndex = preparedLaunchPrompt.indexOf(
  'Only after that barrier, treat any HTTP\nresponse from http://localhost:8888',
);
if (
  launchNoHttpIndex < 0 ||
  launchStartIndex < 0 ||
  launchFirstEdgeClassificationIndex < 0 ||
  launchNoHttpIndex >= launchStartIndex ||
  launchStartIndex >= launchFirstEdgeClassificationIndex
) {
  fail(paths.preparedLaunch, 'launch must forbid HTTP before starting Tox21, Nest and Angular');
}

for (const [target, content] of [
  [paths.runtime, runtime],
  [paths.agents.worker, worker.content],
  [paths.preparedLaunch, preparedLaunch],
]) {
  requireMatch(
    target,
    content,
    /never[\s\S]{0,30}(?:use|run) `require\.resolve`/i,
    'must forbid require.resolve dependency-readiness probes',
  );
}

requireMatch(
  paths.completedLaunch,
  completedLaunch,
  /docs\/autonomous-development\/session\.48h-2026-09-03\.yaml/,
  'completed launch must reference the active dated session configuration',
);
requireMatch(
  paths.completedLaunch,
  completedLaunch,
  /copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir \.\.\/MercurionTox21 --reasoning-effort high --autopilot/,
  'completed launch is missing the deterministic Copilot CLI command',
);
requireMatch(
  paths.completedLaunch,
  completedLaunch,
  /2026-09-05T17:00:00\+02:00/,
  'completed launch is missing the exact soft deadline',
);
requireMatch(
  paths.completedLaunch,
  completedLaunch,
  /feature\/SYS-013/,
  'completed launch must address the pre-existing empty SYS-013 feature branch',
);
requireMatch(
  paths.completedLaunch,
  completedLaunch,
  /Do not reopen terminal tasks `0008` through `0012`/,
  'completed launch must forbid reopening terminal tasks before 0013',
);
for (const command of ['/model', '/permissions show', '/mcp list', '/keep-alive on']) {
  requireMatch(
    paths.completedLaunch,
    completedLaunch,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `completed launch is missing ${command}`,
  );
}

const deadline = '2026-09-02T10:00:00+02:00';
const deadlineMatches = historicalSession.match(
  /^\s*end:\s*"2026-09-02T10:00:00\+02:00"/gm,
);
if (deadlineMatches?.length !== 1) {
  fail(paths.historicalSession, `deadline must remain exactly ${deadline}`);
}

const activeDeadline = '2026-09-05T17:00:00+02:00';
const activeDeadlineMatches = completedSession.match(
  /^\s*end:\s*"2026-09-05T17:00:00\+02:00"/gm,
);
if (activeDeadlineMatches?.length !== 1) {
  fail(paths.completedSession, `deadline must remain exactly ${activeDeadline}`);
}

const closedDeadline = '2026-09-10T10:00:00+02:00';
const closedDeadlineMatches = closedSession.match(
  /^\s*end:\s*"2026-09-10T10:00:00\+02:00"/gm,
);
if (closedDeadlineMatches?.length !== 1) {
  fail(paths.closedSession, `deadline must remain exactly ${closedDeadline}`);
}

const preparedDeadline = '2026-09-20T10:00:00+02:00';
const preparedDeadlineMatches = preparedSession.match(
  /^\s*end:\s*"2026-09-20T10:00:00\+02:00"/gm,
);
if (preparedDeadlineMatches?.length !== 1) {
  fail(paths.preparedSession, `deadline must remain exactly ${preparedDeadline}`);
}

for (const [pattern, message] of [
  [/^repository:\s*$/m, 'missing repository mapping'],
  [/wait_for_feature_ci:\s*true/, 'missing feature CI wait policy'],
  [/require_exact_sha_ci_for_every_develop_base:\s*true/, 'missing exact-SHA baseline policy'],
  [/numbered_tasks_may_repair_baseline:\s*false/, 'numbered tasks must not repair baseline debt'],
  [/wait_for_exact_feature_sha:\s*true/, 'missing exact feature-SHA CI requirement'],
  [/required_check:\s*Required gate/, 'missing stable Required gate contract'],
  [/ubuntu-latest[\s\S]*windows-latest/, 'missing Windows/Linux CI platforms'],
  [/expected_first_pending_task:\s*"0013"/, 'completed workload must resume at task 0013'],
  [/expected_task_count:\s*220/, 'completed workload must contain 220 tasks'],
  [/recovery_control_plane_pull_request:\s*28/, 'completed recovery must record PR #28'],
  [/task:\s*"0008"/, 'missing authorized SYS-008 retry task'],
  [/archived_branch:\s*archive\/SYS-008-attempt-2026-09-03/, 'missing archived SYS-008 retry branch'],
  [/archived_sha:\s*b99d864ef8c8555fe9f28bfa9152cd6581f78720/, 'missing exact archived SYS-008 SHA'],
  [/retry_from_exact_green_develop:\s*true/, 'retry must start from exact green develop'],
  [/allow_wholesale_cherry_pick:\s*false/, 'archived attempt must not be cherry-picked wholesale'],
  [/reset_transitive_skips_to_pending:\s*108/, 'missing authorized reset of 108 speculative skips'],
]) {
  requireMatch(paths.completedSession, completedSession, pattern, message);
}

for (const [pattern, message] of [
  [/workflow_hardening_pull_request:\s*29/, 'closed session must retain PR #29 provenance'],
  [/expected_task_count:\s*220/, 'closed workload must retain 220 tasks'],
  [/expected_current_done:\s*34/, 'closed workload must retain 34 initial DONE tasks'],
  [/expected_current_blocked:\s*4/, 'closed workload must retain four initial blockers'],
  [/expected_current_skipped_dependency:\s*12/, 'closed workload must retain 12 initial skips'],
  [/expected_current_pending:\s*170/, 'closed workload must retain 170 initial pending tasks'],
  [/expected_first_ready_task:\s*"0010"/, 'closed workload must retain task 0010 as its first ready task'],
  [/expected_new_skipped_dependency:\s*14/, 'closed planner expectation must retain 14 new skips'],
  [/dependency_planner:[\s\S]*output:\s*versioned-json/, 'closed session must retain deterministic planner output'],
  [/command:\s*npm run autonomous:plan/, 'closed session must retain the planner command'],
  [/authoritative:\s*true/, 'planner output must be authoritative'],
  [/fail_on_cycles:\s*true/, 'closed session must retain cycle failure policy'],
  [/fail_on_stale_skips:\s*true/, 'closed session must retain stale-skip failure policy'],
  [/multi_task_bundles:\s*false/, 'closed session must retain its task-bundle policy'],
  [/require_fresh_full_remote_ci_at_session_start:\s*true/, 'closed session must retain full startup CI policy'],
  [/metadata_must_not_feed_application_inventories:\s*true/, 'closed session must retain metadata isolation'],
  [/manual_dispatch_default:\s*full/, 'closed session must retain full manual CI default'],
  [/manual_full_bypasses_duplicate_reuse:\s*true/, 'closed session must retain manual duplicate bypass'],
  [/PYTHONUTF8:\s*"1"/, 'closed session must retain Tox21 UTF-8 policy'],
  [/preserve_blocked:[\s\S]*- "0020"[\s\S]*- "0076"[\s\S]*- "0109"[\s\S]*- "0114"/, 'closed session must retain all four blockers'],
]) {
  requireMatch(paths.closedSession, closedSession, pattern, message);
}

for (const [pattern, message] of [
  [/browser_and_allowlist_hardening_pull_request:\s*31/, 'prepared session must record PR #31 provenance'],
  [/name:\s*mercurion-code-red-0001-overweek-full-series-2026-09-20-v6/, 'prepared session must use a fresh session identity'],
  [/expected_task_count:\s*220/, 'prepared workload must contain 220 tasks'],
  [/expected_current_done:\s*57/, 'prepared workload must record 57 DONE tasks'],
  [/expected_current_blocked:\s*3/, 'prepared workload must record three retained blockers'],
  [/expected_current_skipped_dependency:\s*13/, 'prepared workload must record 13 terminal skips'],
  [/expected_current_pending:\s*147/, 'prepared workload must record 147 pending tasks'],
  [/expected_first_ready_task:\s*"0054"/, 'prepared workload must start from task 0054'],
  [/expected_planner_ready:\s*17/, 'prepared workload must record 17 ready tasks'],
  [/expected_planner_waiting_dependency:\s*130/, 'prepared workload must record 130 waiting tasks'],
  [/tasks:\s*\[\]/, 'prepared workload must select the complete Series'],
  [/expected_autonomous_pending:\s*147/, 'prepared workload must record all 147 pending tasks in scope'],
  [/expected_human_led_pending:\s*0/, 'prepared workload must not exclude pending tasks'],
  [/autonomous_execution_scope:\s*complete-series/, 'prepared workload must declare complete-Series execution'],
  [/dependency_planner:[\s\S]*output:\s*versioned-json/, 'prepared session must use deterministic planner output'],
  [/command:\s*npm run autonomous:plan/, 'prepared session must declare the planner command'],
  [/fail_on_cycles:\s*true/, 'prepared session must fail on dependency cycles'],
  [/fail_on_stale_skips:\s*true/, 'prepared session must fail on stale skips'],
  [/multi_task_bundles:\s*false/, 'prepared session must prohibit task bundles'],
  [/require_fresh_full_remote_ci_at_session_start:\s*true/, 'prepared session must require fresh full startup CI'],
  [/metadata_must_not_feed_application_inventories:\s*true/, 'prepared metadata must be isolated from application inventories'],
  [/owner:\s*development-task-worker/, 'prepared persistent browser must belong to the task worker'],
  [/mode:\s*dedicated-persistent/, 'prepared session must use the dedicated persistent browser'],
  [/failure_result:\s*SESSION_CAPABILITY_PAUSE/, 'prepared session must pause before task mutation when browser capability is missing'],
  [/continue_session_after_pause:\s*true/, 'prepared session must continue after a task capability pause'],
  [/exclude_paused_task_for_remainder_of_session:\s*true/, 'prepared session must exclude a paused task for the rest of the session'],
  [/retry_paused_task_in_same_session:\s*false/, 'prepared session must prohibit same-session retries of capability-paused tasks'],
  [/authenticated_entrypoint:\s*http:\/\/localhost:8888\/login/, 'prepared session must declare the ordinary login entrypoint'],
  [/authentication_mode:\s*fresh-shared-real-test-account-login/, 'prepared session must require fresh real-account login per worker'],
  [/credential_file:\s*MercurionWebNode\/env\/\.env\.development/, 'prepared session must declare the git-ignored credential file'],
  [/LOCAL_TEST_ACCOUNT_EMAIL[\s\S]*LOCAL_TEST_ACCOUNT_PASSWORD/, 'prepared session must require both shared credential variables'],
  [/LOCAL_DUMMY_AUTH:\s*"false"/, 'prepared session must disable deprecated local dummy auth'],
  [/required_once_before_enabling_unattended_reuse:\s*false/, 'prepared session must not gate launch on profile persistence'],
  [/fe_019_completed:[\s\S]*task:\s*"0041"[\s\S]*source:\s*FE-019[\s\S]*outcome:\s*DONE[\s\S]*select_again:\s*false/, 'prepared session must retain completed FE-019 without re-enabling it'],
  [/preserve_existing_frozen_branches:\s*true/, 'prepared session must preserve frozen blocked branches'],
  [/stop_and_report_exact_denial:\s*false/, 'prepared session must not stop on a denied prerequisite'],
  [/enter_session_recovery_pending:\s*true/, 'prepared session must recover from denied prerequisites'],
  [/SESSION_BRANCH_COLLISION_PAUSE/, 'prepared session must declare branch collision as transient'],
  [/SESSION_RECOVERY_PENDING/, 'prepared session must declare coordinator recovery as transient'],
  [/preferred_tool:\s*fill_form[\s\S]*fallback_tool:\s*fill[\s\S]*clipboard_denial_is_capability_failure:\s*false/, 'prepared session must use supported browser form filling and reject clipboard-denial pauses'],
  [/stop_when_no_unpaused_ready_tasks:\s*false/, 'prepared session must remain active while pending tasks are temporarily excluded'],
  [/branch_collision_excludes_only_colliding_task:\s*true/, 'prepared session must isolate only the colliding task'],
  [/error_before_deadline_completes_session:\s*false/, 'prepared session must forbid error-driven early completion'],
  [/stop_session_if_revert_not_green:\s*false/, 'prepared session must recover rather than stop on revert verification failure'],
  [/session_fatal_blocker_completes_coordinator_objective:\s*false/, 'prepared session must disable fatal-blocker completion'],
  [/task_complete_before_deadline_on_error:\s*false/, 'prepared session must forbid task_complete on pre-deadline errors'],
]) {
  requireMatch(paths.preparedSession, preparedSession, pattern, message);
}

for (const stalePattern of [
  /allow_task_0001_phase_0_bootstrap_only/,
  /repair_repository_controlled_failures/,
  /bootstrap_until_task/,
  /require_exact_sha_ci_for_later_develop_bases/,
  /propagate_skipped_dependency_transitively:\s*true/,
  /batch_dependency_skip_metadata_commit:\s*true/,
]) {
  if (stalePattern.test(completedSession)) {
    fail(paths.completedSession, `contains retired Phase 0 policy ${stalePattern.source}`);
  }
}

for (const [pattern, message] of [
  [/baseline_document:\s*docs\/autonomous-development\/CI-BASELINE\.md/, 'missing permanent baseline document'],
  [/numbered_tasks_may_repair_baseline:\s*false/, 'numbered tasks must not repair baseline debt'],
  [/wait_for_exact_feature_sha:\s*true/, 'missing exact feature-SHA CI requirement'],
  [/required_check:\s*Required gate/, 'missing stable Required gate contract'],
  [/ubuntu-latest[\s\S]*windows-latest/, 'missing Windows/Linux CI platforms'],
  [/push_feature_branch_before_work:\s*false/, 'feature branch must not be pushed before task work'],
  [/push_feature_branch_after_first_task_commit:\s*true/, 'first feature push must follow a task commit'],
  [/forbid_remote_feature_ref_equal_to_base_sha:\s*true/, 'duplicate base-SHA feature refs must be forbidden'],
  [/dependency_selection:\s*graph-snapshot/, 'missing graph snapshot scheduler'],
  [/waiting_dependency_is_transient:\s*true/, 'WAITING_DEPENDENCY must remain transient'],
  [/dependency_skip_evaluation:\s*batched-terminal-transitive-closure/, 'missing batched terminal skip policy'],
  [/precompute_transitive_dependency_skips:\s*true/, 'terminal skip closure must be precomputed'],
  [/batch_dependency_skip_metadata_commit:\s*true/, 'dependency skip metadata must be batched'],
  [/single_metadata_commit_per_skip_closure:\s*true/, 'skip closure must use one metadata commit'],
  [/duplicate_requires_prior_successful_exact_sha:\s*true/, 'duplicate CI requires prior exact-SHA success'],
  [/metadata_requires_green_exact_base_sha:\s*true/, 'metadata CI requires an exact green base'],
  [/unknown_or_ambiguous_fallback:\s*full/, 'ambiguous CI classification must fall back to full'],
  [/stable_required_gate_for_every_mode:\s*true/, 'every CI mode must publish Required gate'],
  [/require_fresh_full_remote_ci_at_session_start:\s*true/, 'session startup must require fresh full remote CI'],
  [/metadata_must_not_feed_application_inventories:\s*true/, 'metadata must be isolated from application inventories'],
  [/manual_dispatch_default:\s*full/, 'manual CI dispatch must default to full'],
  [/manual_full_bypasses_duplicate_reuse:\s*true/, 'manual full CI must bypass duplicate reuse'],
  [/PYTHONUTF8:\s*"1"/, 'Tox21 runtime must force UTF-8'],
  [/dependency_planner:[\s\S]*command:\s*npm run autonomous:plan/, 'missing deterministic planner command'],
  [/authoritative:\s*true/, 'planner output must be authoritative'],
  [/fail_on_cycles:\s*true/, 'planner must fail on cycles'],
  [/fail_on_stale_skips:\s*true/, 'planner must fail on stale skips'],
  [/multi_task_bundles:\s*false/, 'multi-task bundles must remain disabled'],
  [/owner:\s*development-task-worker/, 'persistent browser must belong to the task worker'],
  [/mode:\s*dedicated-persistent/, 'missing dedicated persistent browser profile'],
  [/isolated:\s*false/, 'persistent browser profile must disable isolation'],
  [/reuse_across_serial_workers:\s*true/, 'browser profile must be reused across serial workers'],
  [/failure_result:\s*SESSION_CAPABILITY_PAUSE/, 'missing browser capability pause result'],
  [/propagate_dependency_skips:\s*false/, 'browser capability pause must not propagate dependency skips'],
  [/continue_session_after_pause:\s*true/, 'browser capability pause must not stop the session'],
  [/exclude_paused_task_for_remainder_of_session:\s*true/, 'paused browser task must be excluded for the rest of the session'],
  [/retry_paused_task_in_same_session:\s*false/, 'paused browser task must not be retried in the same session'],
  [/recovery_failure_signal:\s*BROWSER_PROFILE_RECOVERY_REQUIRED/, 'missing browser profile recovery signal'],
  [/restore_after_explicit_logout_or_storage_test:\s*false/, 'ordinary worker logout must not require auth restoration'],
  [/stop_before_next_task_on_recovery_failure:\s*false/, 'anonymous profile state must not stop later task selection'],
  [/secrets_in_reports:\s*false/, 'browser secrets must be excluded from reports'],
  [/required_once_before_enabling_unattended_reuse:\s*true/, 'missing one-time persistent-profile acceptance test'],
  [/fresh_sequential_workers:\s*2/, 'persistent profile must be proven across two fresh workers'],
  [/storage_key:\s*mercurion-autonomous-profile-probe/, 'missing bounded browser acceptance-probe key'],
  [/remove_probe_state:\s*true/, 'browser acceptance probe must clean up its state'],
]) {
  requireMatch(paths.exampleSession, exampleSession, pattern, message);
}

for (const [target, content] of [
  [paths.agents.coordinator, coordinator.content],
  ['docs/autonomous-development/PROTOCOL.md', read('docs/autonomous-development/PROTOCOL.md')],
]) {
  requireMatch(
    target,
    content,
    /workload\.tasks[\s\S]{0,500}(?:exact allowlist|exact session allowlist)/i,
    'missing exact autonomous workload allowlist contract',
  );
  requireMatch(
    target,
    content,
    /(?:omitted|outside)[\s\S]{0,300}`PENDING`/i,
    'out-of-workload recipes must remain pending',
  );
  requireMatch(
    target,
    content,
    /(?:do not|never)[\s\S]{0,200}(?:mark it `BLOCKED`|`BLOCKED`)/i,
    'workload exclusion must not become BLOCKED',
  );
}

const workflow = read(paths.workflow);
const classifier = read(paths.classifier);
const planner = read(paths.planner);
const reportTemplate = read(paths.reportTemplate);
const packageJson = JSON.parse(read('package.json'));

for (const [pattern, message] of [
  [/^\s*plan:\s*$/m, 'missing CI classification job'],
  [/validation_mode:[\s\S]*default:\s*full[\s\S]*- full[\s\S]*- auto/, 'manual CI dispatch must expose full-by-default validation'],
  [/needs\.plan\.outputs\.mode == 'metadata'/, 'missing metadata CI path'],
  [/needs\.plan\.outputs\.mode == 'full'/, 'missing full CI path'],
  [/name:\s*Required gate/, 'missing stable Required gate'],
  [/needs:[\s\S]*- plan[\s\S]*- metadata[\s\S]*- quality/, 'Required gate must observe every CI path'],
  [/actions:\s*read/, 'classifier requires read-only Actions access'],
  [/fetch-depth:\s*0/, 'classifier requires complete comparison history'],
]) {
  requireMatch(paths.workflow, workflow, pattern, message);
}

for (const [pattern, message] of [
  [/isForcedFullRun/, 'missing manual full-run override'],
  [/manual dispatch requested a fresh full baseline/, 'manual full-run reason is not observable'],
  [/waitForOlderSuccessfulRun/, 'missing duplicate-SHA reuse'],
  [/Number\(run\.id\) < currentRunId/, 'duplicate waiting must only consider older runs'],
  [/isMetadataOnly\(files\)[\s\S]*hasSuccessfulRun\(baseSha\)/, 'metadata mode must require a green base'],
  [/docs\\\/autonomous-development\\\/task/, 'missing task metadata allowlist'],
  [/finish\(\s*'full'/, 'uncertain classifications must retain the full path'],
  [/--self-test/, 'classifier must expose its deterministic self-test'],
]) {
  requireMatch(paths.classifier, classifier, pattern, message);
}

const routeOwnership = read(paths.routeOwnership);
const routeOwnershipNegative = read(paths.routeOwnershipNegative);
requireMatch(
  paths.routeOwnership,
  routeOwnership,
  /path\.join\(root, 'docs', 'architecture'\)/,
  'route evidence must use the product architecture documentation root',
);
if (/path\.join\(root, 'docs'\),/.test(routeOwnership)) {
  fail(paths.routeOwnership, 'must not scan all docs including autonomous metadata');
}
requireMatch(
  paths.routeOwnership,
  routeOwnership,
  /summarizeInventoryDrift/,
  'stale route inventory must emit actionable drift diagnostics',
);
for (const [pattern, message] of [
  [/rest-route-ownership-metadata-probe/, 'missing autonomous metadata isolation probe'],
  [/docs\/autonomous-development\//, 'metadata isolation test must reject autonomous references'],
  [/must not change the application inventory/, 'metadata isolation regression assertion is missing'],
]) {
  requireMatch(paths.routeOwnershipNegative, routeOwnershipNegative, pattern, message);
}

if (!classifier.includes('(?!0000-)')) {
  fail(paths.classifier, 'task metadata allowlist must exclude templates');
}
if (
  !classifier.includes(
    'reports\\/[0-9]{4}-[0-9]{2}-[0-9]{2}-',
  )
) {
  fail(paths.classifier, 'report metadata allowlist must require a dated report');
}

if (
  !packageJson.scripts?.['ci:validate:autonomous']?.includes(
    'node .github/scripts/classify-ci.mjs --self-test',
  )
) {
  fail('package.json', 'ci:validate:autonomous must run the classifier self-test');
}
if (
  packageJson.scripts?.['autonomous:plan'] !==
  'node docs/autonomous-development/tools/plan-dependency-graph.mjs --json'
) {
  fail('package.json', 'autonomous:plan must emit the deterministic JSON snapshot');
}
for (const requiredCommand of [
  'node docs/autonomous-development/tools/plan-dependency-graph.mjs --self-test',
  'node docs/autonomous-development/tools/plan-dependency-graph.mjs --check',
]) {
  if (!packageJson.scripts?.['ci:validate:autonomous']?.includes(requiredCommand)) {
    fail('package.json', `ci:validate:autonomous must run ${requiredCommand}`);
  }
}

for (const [pattern, message] of [
  [/export function parseRecipe/, 'planner must expose deterministic recipe parsing'],
  [/export function planRecipes/, 'planner must expose deterministic graph planning'],
  [/detectCycles/, 'planner must detect dependency cycles'],
  [/Advisory:/, 'planner must distinguish advisory dependencies'],
  [/SKIPPED_DEPENDENCY/, 'planner must propagate terminal dependency skips'],
  [/staleSkips/, 'planner must detect stale skip outcomes'],
  [/--self-test/, 'planner must expose a deterministic self-test'],
  [/--check/, 'planner must expose a fail-closed validation mode'],
  [/version:\s*1/, 'planner output must be versioned'],
]) {
  requireMatch(paths.planner, planner, pattern, message);
}
requireMatch(
  paths.agents.coordinator,
  coordinator.content,
  /npm run autonomous:plan[\s\S]*sole[\s\S]{0,100}(?:authoritative|scheduling authority)/,
  'coordinator must use planner JSON as its sole scheduling authority',
);

for (const [pattern, message] of [
  [/## CI and execution efficiency/, 'missing CI efficiency reporting section'],
  [/CI classifications:/, 'missing CI classification counters'],
  [/Platform jobs:/, 'missing platform-runner counters'],
  [/Dependency scheduling:/, 'missing dependency scheduling metrics'],
  [/Persistent browser profile:/, 'missing persistent browser reporting'],
  [/Session capability pauses:/, 'missing browser capability-pause reporting'],
]) {
  requireMatch(paths.reportTemplate, reportTemplate, pattern, message);
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
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    '.github/scripts/start-chrome-devtools-mcp.ps1',
  ];
  if (
    !chrome ||
    chrome.type !== 'local' ||
    chrome.command !== 'pwsh' ||
    JSON.stringify(chrome.args) !== JSON.stringify(expectedArgs)
  ) {
    fail(paths.mcp, 'chrome-devtools must use the deterministic Windows lifecycle launcher');
  }
  if (chrome?.args?.includes('--isolated')) {
    fail(paths.mcp, 'autonomous Chrome must reuse its dedicated persistent profile');
  }
}

const mcpLauncher = read(paths.mcpLauncher);
for (const [pattern, message] of [
  [/chrome-devtools-mcp@1\.8\.0/, 'Chrome DevTools MCP launcher must pin version 1.8.0'],
  [/--headless/, 'Chrome DevTools MCP launcher must remain headless'],
  [/--user-data-dir=\$profilePath/, 'Chrome DevTools MCP launcher must select the dedicated persistent profile explicitly'],
  [/Stop-DedicatedChrome[\s\S]*try[\s\S]*finally[\s\S]*Stop-DedicatedChrome/, 'Chrome DevTools MCP launcher must clean dedicated Chrome before and after each lease'],
  [/IndexOf\(\$profilePath,[\s\S]*OrdinalIgnoreCase/, 'Chrome cleanup must be scoped to the exact dedicated profile'],
]) {
  requireMatch(paths.mcpLauncher, mcpLauncher, pattern, message);
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

for (const target of [
  'AGENTS.md',
  paths.agents.coordinator,
  paths.agents.worker,
  'docs/autonomous-development/PROTOCOL.md',
  'docs/autonomous-development/RUNTIME.md',
]) {
  const content = read(target);
  requireMatch(
    target,
    content,
    /(?:never|must not|forbidden)[\s\S]{0,160}`npm ci`[\s\S]{0,80}`npm run ci:check`|`npm ci`[\s\S]{0,80}`npm run ci:check`[\s\S]{0,160}(?:never|must not|forbidden)/i,
    'must forbid local npm ci and npm run ci:check',
  );
}

for (const [target, content] of [
  [paths.exampleSession, exampleSession],
  [paths.preparedSession, preparedSession],
]) {
  requireMatch(
    target,
    content,
    /local_full_commands_forbidden:\s*true/,
    'active session must forbid local full commands',
  );
  requireMatch(
    target,
    content,
    /execution_owner:\s*github-actions/,
    'canonical clean install and aggregate must belong to GitHub Actions',
  );
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
    'CLI runner validation passed: JSON, YAML structure, explicit agent tools, slugged task delegation, non-mutating handshake, MCP, historical session provenance, adaptive exact-SHA CI, delayed feature publication, deterministic dependency planning, dated launch/session policy, batched dependency skips, telemetry, terminal states, startup probe, signing, and finalization order are valid.',
  );
}
