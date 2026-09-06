#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const STATES = ['DONE', 'BLOCKED', 'REVERTED', 'SKIPPED_DEPENDENCY'];
const TERMINAL_ROOT_STATES = new Set(['BLOCKED', 'REVERTED']);

function section(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !/^##\s+/.test(lines[end])) end += 1;
  return lines.slice(start + 1, end).join('\n');
}

export function parseRecipe(filename, markdown) {
  const id = filename.match(/^(\d{4})-/)?.[1];
  if (!id) throw new Error(`${filename}: invalid numbered recipe filename`);

  const markers = STATES.flatMap((state) =>
    [...markdown.matchAll(new RegExp(`^- \\[([ xX])\\] ${state}$`, 'gm'))].map(
      (match) => ({ state, checked: match[1].toLowerCase() === 'x' }),
    ),
  );
  for (const state of STATES) {
    const count = markers.filter((marker) => marker.state === state).length;
    if (count !== 1) throw new Error(`${filename}: expected one ${state} checkbox, found ${count}`);
  }
  const checked = markers.filter((marker) => marker.checked);
  if (checked.length > 1) {
    throw new Error(`${filename}: terminal states are mutually exclusive`);
  }

  const dependencies = section(markdown, 'Dependencies');
  if (dependencies === null) throw new Error(`${filename}: missing Dependencies section`);
  const hardLines = dependencies
    .split(/\r?\n/)
    .filter((line) => /^- /.test(line) && !/^- Advisory:/i.test(line));
  const hardDependencies = [
    ...new Set(
      hardLines.flatMap((line) =>
        [...line.matchAll(/\b(\d{4})(?:-[a-z0-9][a-z0-9-]*\.md)?\b/gi)].map(
          (match) => match[1],
        ),
      ),
    ),
  ].filter((dependency) => dependency !== '0000' && dependency !== id);

  const source = markdown.match(/^Source:\s*`([A-Z]+-\d{3})`\s+in Series\s+`\d{4}`\./m)?.[1] ?? null;
  return {
    id,
    filename,
    source,
    status: checked[0]?.state ?? 'PENDING',
    hardDependencies,
  };
}

function detectCycles(recipesById) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];

  function visit(id) {
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const dependency of recipesById.get(id)?.hardDependencies ?? []) visit(dependency);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of recipesById.keys()) visit(id);
  return cycles;
}

export function planRecipes(recipes) {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const errors = [];
  for (const recipe of recipes) {
    for (const dependency of recipe.hardDependencies) {
      if (!recipesById.has(dependency)) {
        errors.push(`${recipe.filename}: missing hard dependency ${dependency}`);
      }
    }
  }

  const cycles = detectCycles(recipesById);
  for (const cycle of cycles) errors.push(`dependency cycle: ${cycle.join(' -> ')}`);

  const memo = new Map();
  function terminalRoots(id, ancestry = new Set()) {
    if (ancestry.has(id)) return new Set();
    if (memo.has(id)) return new Set(memo.get(id));
    const recipe = recipesById.get(id);
    if (!recipe || recipe.status === 'DONE') return new Set();
    if (TERMINAL_ROOT_STATES.has(recipe.status)) return new Set([id]);

    const nextAncestry = new Set(ancestry).add(id);
    const roots = new Set();
    for (const dependency of recipe.hardDependencies) {
      for (const root of terminalRoots(dependency, nextAncestry)) roots.add(root);
    }
    memo.set(id, [...roots]);
    return roots;
  }

  const classifications = [];
  const staleSkips = [];
  const toSkip = [];
  for (const recipe of recipes) {
    const dependencyRoots = new Set();
    for (const dependency of recipe.hardDependencies) {
      for (const root of terminalRoots(dependency)) dependencyRoots.add(root);
    }
    const roots = [...dependencyRoots].sort();

    let classification = recipe.status;
    if (recipe.status === 'PENDING') {
      if (roots.length > 0) classification = 'SKIPPED_DEPENDENCY';
      else if (
        recipe.hardDependencies.every(
          (dependency) => recipesById.get(dependency)?.status === 'DONE',
        )
      ) classification = 'READY';
      else classification = 'WAITING_DEPENDENCY';
    } else if (recipe.status === 'SKIPPED_DEPENDENCY' && roots.length === 0) {
      staleSkips.push(recipe.id);
    }

    const entry = {
      id: recipe.id,
      filename: recipe.filename,
      source: recipe.source,
      currentStatus: recipe.status,
      classification,
      hardDependencies: recipe.hardDependencies,
      terminalRoots: roots,
    };
    classifications.push(entry);
    if (recipe.status === 'PENDING' && classification === 'SKIPPED_DEPENDENCY') {
      toSkip.push(entry);
    }
  }

  const currentCounts = Object.fromEntries(
    ['PENDING', ...STATES].map((state) => [
      state,
      recipes.filter((recipe) => recipe.status === state).length,
    ]),
  );
  const planningCounts = {};
  for (const entry of classifications) {
    planningCounts[entry.classification] = (planningCounts[entry.classification] ?? 0) + 1;
  }

  return {
    version: 1,
    recipeCount: recipes.length,
    currentCounts,
    planningCounts,
    ready: classifications.filter((entry) => entry.classification === 'READY'),
    waiting: classifications.filter((entry) => entry.classification === 'WAITING_DEPENDENCY'),
    toSkip,
    staleSkips,
    cycles,
    errors,
  };
}

function loadRecipes(taskDirectory) {
  return fs
    .readdirSync(taskDirectory)
    .filter((name) => /^\d{4}-.*\.md$/.test(name) && !name.startsWith('0000-'))
    .sort()
    .map((filename) =>
      parseRecipe(filename, fs.readFileSync(path.join(taskDirectory, filename), 'utf8')),
    );
}

function fixture(id, status, dependencies = [], advisory = []) {
  const markers = STATES.map(
    (state) => `- [${state === status ? 'x' : ' '}] ${state}`,
  ).join('\n');
  const hard = dependencies.map((dependency) => `- ${dependency}-task.md`).join('\n');
  const soft = advisory.map((dependency) => `- Advisory: ${dependency}-task.md`).join('\n');
  return `# ${id}\n\n${markers}\n\nSource: \`SYS-${id.slice(1)}\` in Series \`0001\`.\n\n## Dependencies\n\n${hard}\n${soft}\n\n## Execution notes\n`;
}

function selfTest() {
  const recipes = [
    parseRecipe('0001-a.md', fixture('0001', 'DONE')),
    parseRecipe('0002-b.md', fixture('0002', null, ['0001'], ['0004'])),
    parseRecipe('0003-c.md', fixture('0003', 'BLOCKED', ['0001'])),
    parseRecipe('0004-d.md', fixture('0004', null, ['0002'])),
    parseRecipe('0005-e.md', fixture('0005', null, ['0003'])),
    parseRecipe('0006-f.md', fixture('0006', 'SKIPPED_DEPENDENCY', ['0005'])),
    parseRecipe('0007-g.md', fixture('0007', 'SKIPPED_DEPENDENCY', ['0001'])),
  ];
  const plan = planRecipes(recipes);
  assert.deepEqual(plan.ready.map((entry) => entry.id), ['0002']);
  assert.deepEqual(plan.waiting.map((entry) => entry.id), ['0004']);
  assert.deepEqual(plan.toSkip.map((entry) => entry.id), ['0005']);
  assert.deepEqual(plan.toSkip[0].terminalRoots, ['0003']);
  assert.deepEqual(plan.staleSkips, ['0007']);
  assert.equal(plan.cycles.length, 0);
  assert.equal(plan.errors.length, 0);
  console.log('Dependency planner self-test passed.');
}

function summary(plan) {
  console.log(`Dependency plan: ${plan.recipeCount} recipes`);
  console.log(`Current: ${JSON.stringify(plan.currentCounts)}`);
  console.log(`Planning: ${JSON.stringify(plan.planningCounts)}`);
  console.log(`READY: ${plan.ready.map((entry) => entry.id).join(', ') || 'none'}`);
  console.log(`TO_SKIP: ${plan.toSkip.map((entry) => entry.id).join(', ') || 'none'}`);
  console.log(`STALE_SKIPS: ${plan.staleSkips.join(', ') || 'none'}`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const taskDirectory = path.resolve(scriptDirectory, '../task');
  let plan;
  try {
    plan = planRecipes(loadRecipes(taskDirectory));
  } catch (error) {
    console.error(`Dependency planner failed: ${error.message}`);
    process.exitCode = 1;
    process.exit();
  }

  if (process.argv.includes('--json')) console.log(JSON.stringify(plan, null, 2));
  else summary(plan);

  if (
    process.argv.includes('--check') &&
    (plan.errors.length > 0 || plan.cycles.length > 0 || plan.staleSkips.length > 0)
  ) {
    process.exitCode = 1;
  }
}
