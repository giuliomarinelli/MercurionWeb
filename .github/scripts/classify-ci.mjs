#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import process from 'node:process';

const ZERO_SHA = /^0+$/;
const METADATA_PATHS = [
  /^docs\/autonomous-development\/task\/[0-9]{4}-[^/]+\.md$/,
  /^docs\/autonomous-development\/reports\/[^/]+\.md$/,
];

export function isMetadataPath(file) {
  return METADATA_PATHS.some((pattern) => pattern.test(file));
}

export function isMetadataOnly(files) {
  return files.length > 0 && files.every(isMetadataPath);
}

function output(name, value) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, name + '=' + String(value) + '\n');
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function api(pathname) {
  const response = await fetch('https://api.github.com' + pathname, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      'User-Agent': 'mercurion-ci-classifier',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error('GitHub API ' + response.status + ' for ' + pathname);
  }

  return response.json();
}

async function workflowRunsForSha(sha) {
  const repository = process.env.GITHUB_REPOSITORY;
  const encodedSha = encodeURIComponent(sha);
  const pathname =
    '/repos/' + repository + '/actions/workflows/ci.yml/runs?head_sha=' +
    encodedSha + '&per_page=100';
  const payload = await api(pathname);
  return payload.workflow_runs ?? [];
}

async function waitForOlderSuccessfulRun(sha) {
  const currentRunId = Number(process.env.GITHUB_RUN_ID);
  const waitSeconds = Number(process.env.CI_DUPLICATE_WAIT_SECONDS ?? '900');
  const deadline = Date.now() + waitSeconds * 1000;

  for (;;) {
    const olderRuns = (await workflowRunsForSha(sha)).filter(
      (run) => Number(run.id) < currentRunId,
    );

    if (olderRuns.some((run) => run.status === 'completed' && run.conclusion === 'success')) {
      return true;
    }

    const olderRunActive = olderRuns.some((run) => run.status !== 'completed');
    if (!olderRunActive || Date.now() >= deadline) return false;
    await sleep(20_000);
  }
}

async function hasSuccessfulRun(sha) {
  if (!sha) return false;
  const currentRunId = Number(process.env.GITHUB_RUN_ID);
  const runs = await workflowRunsForSha(sha);
  return runs.some(
    (run) =>
      Number(run.id) !== currentRunId &&
      run.status === 'completed' &&
      run.conclusion === 'success',
  );
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function resolveBaseSha(event, headSha) {
  if (process.env.GITHUB_EVENT_NAME === 'push') {
    if (event.before && !ZERO_SHA.test(event.before)) return event.before;
    if (process.env.GITHUB_REF === 'refs/heads/develop') return null;
    return git('merge-base', 'origin/develop', headSha);
  }

  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const pullBase = event.pull_request?.base?.sha;
    return pullBase ? git('merge-base', pullBase, headSha) : null;
  }

  return null;
}

function changedFiles(baseSha, headSha) {
  if (!baseSha) return [];
  const outputText = git(
    'diff',
    '--name-only',
    '--diff-filter=ACDMRTUXB',
    baseSha,
    headSha,
  );
  return outputText ? outputText.split(/\r?\n/).filter(Boolean) : [];
}

function finish(mode, reason, baseSha, files) {
  output('mode', mode);
  output('reason', reason);
  output('base_sha', baseSha ?? '');
  output('change_count', files.length);
  console.log(
    JSON.stringify(
      { mode, reason, baseSha: baseSha ?? null, changedFiles: files },
      null,
      2,
    ),
  );
}

async function main() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const headSha = process.env.GITHUB_SHA;

  if (await waitForOlderSuccessfulRun(headSha)) {
    finish('duplicate', 'an older CI run already succeeded for the exact SHA', null, []);
    return;
  }

  const baseSha = resolveBaseSha(event, headSha);
  if (!baseSha) {
    finish('full', 'no trustworthy comparison base is available', null, []);
    return;
  }

  const files = changedFiles(baseSha, headSha);
  if (isMetadataOnly(files) && (await hasSuccessfulRun(baseSha))) {
    finish(
      'metadata',
      'only allowlisted autonomous task/report metadata changed from a green exact SHA',
      baseSha,
      files,
    );
    return;
  }

  finish(
    'full',
    files.length === 0
      ? 'the SHA has no prior successful CI run'
      : 'code, configuration, workflow, or a non-allowlisted path changed',
    baseSha,
    files,
  );
}

function selfTest() {
  assert.equal(
    isMetadataPath('docs/autonomous-development/task/0020-decide-notebook.md'),
    true,
  );
  assert.equal(
    isMetadataPath('docs/autonomous-development/reports/2026-09-05-final.md'),
    true,
  );
  assert.equal(isMetadataPath('docs/autonomous-development/PROTOCOL.md'), false);
  assert.equal(isMetadataPath('.github/workflows/ci.yml'), false);
  assert.equal(isMetadataPath('MercurionWebNg/src/app/app.component.ts'), false);
  assert.equal(
    isMetadataOnly([
      'docs/autonomous-development/task/0020-decide-notebook.md',
      'docs/autonomous-development/reports/2026-09-05-final.md',
    ]),
    true,
  );
  assert.equal(isMetadataOnly([]), false);
  console.log('CI classifier self-test passed.');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  await main();
}
