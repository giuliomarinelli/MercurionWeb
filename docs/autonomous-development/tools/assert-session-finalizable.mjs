#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, '../../..');

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function positionalArguments() {
  const values = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index].startsWith('--')) {
      index += 1;
      continue;
    }
    values.push(process.argv[index]);
  }
  return values;
}

export function evaluateFinalization({ now, deadline, pending }) {
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new Error('invalid current timestamp');
  }
  if (!(deadline instanceof Date) || Number.isNaN(deadline.valueOf())) {
    throw new Error('invalid session deadline');
  }
  if (!Number.isInteger(pending) || pending < 0) {
    throw new Error('planner PENDING count must be a non-negative integer');
  }

  if (pending === 0) {
    return { finalizable: true, reason: 'WORKLOAD_EXHAUSTED', pending };
  }
  if (now >= deadline) {
    return { finalizable: true, reason: 'SOFT_DEADLINE_REACHED', pending };
  }
  return {
    finalizable: false,
    reason: 'PENDING_WORK_REMAINS_BEFORE_DEADLINE',
    pending,
  };
}

function readDeadline(sessionPath) {
  const content = fs.readFileSync(sessionPath, 'utf8');
  const match = content.match(/^  end:\s*["']?([^"'\r\n#]+)["']?/m);
  if (!match) throw new Error('session.end is missing');
  return new Date(match[1].trim());
}

function readPlan() {
  const plannerPath = path.join(toolDirectory, 'plan-dependency-graph.mjs');
  const result = spawnSync(process.execPath, [plannerPath, '--json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`autonomous planner failed: ${(result.stderr || result.stdout || result.error?.message || 'unknown error').trim()}`);
  }
  const jsonStart = result.stdout.indexOf('{');
  if (jsonStart === -1) throw new Error('autonomous planner did not emit JSON');
  return JSON.parse(result.stdout.slice(jsonStart));
}

function selfTest() {
  const deadline = new Date('2026-09-23T10:00:00+02:00');
  const before = new Date('2026-09-22T10:00:00+02:00');
  const atDeadline = new Date('2026-09-23T10:00:00+02:00');

  if (evaluateFinalization({ now: before, deadline, pending: 1 }).finalizable) {
    throw new Error('pre-deadline pending workload must fail closed');
  }
  if (!evaluateFinalization({ now: before, deadline, pending: 0 }).finalizable) {
    throw new Error('exhausted workload must be finalizable');
  }
  if (!evaluateFinalization({ now: atDeadline, deadline, pending: 1 }).finalizable) {
    throw new Error('deadline completion must be finalizable');
  }
  console.log('Session finalization guard self-test passed.');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  try {
    const sessionArgument = argument('--session') ?? positionalArguments()[0];
    if (!sessionArgument) throw new Error('usage: <session-yaml>');
    const sessionPath = path.resolve(repositoryRoot, sessionArgument);
    const plan = readPlan();
    if (plan.errors?.length || plan.cycles?.length || plan.staleSkips?.length) {
      throw new Error('planner snapshot is not safe for finalization');
    }
    const result = evaluateFinalization({
      now: new Date(),
      deadline: readDeadline(sessionPath),
      pending: plan.currentCounts?.PENDING,
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.finalizable) process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({ finalizable: false, reason: 'GUARD_ERROR', error: error.message }));
    process.exitCode = 1;
  }
}
