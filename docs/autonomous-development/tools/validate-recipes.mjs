#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, '../../..');
const taskDirectory = path.join(repositoryRoot, 'docs/autonomous-development/task');
const seriesDirectory = path.join(repositoryRoot, 'docs/autonomous-development/series');

const errors = [];
const warnings = [];

function report(target, message) {
  errors.push(`${target}: ${message}`);
}

function readMarkdownFiles(directory, includeTemplate = false) {
  return fs
    .readdirSync(directory)
    .filter((name) => /^\d{4}-.*\.md$/.test(name))
    .filter((name) => includeTemplate || !name.startsWith('0000-'))
    .sort();
}

function section(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start === -1) return null;
  const remainder = markdown.slice(start + marker.length);
  const next = remainder.search(/\n## /);
  return next === -1 ? remainder : remainder.slice(0, next);
}

const taskFiles = readMarkdownFiles(taskDirectory);
const seriesFiles = readMarkdownFiles(seriesDirectory);
const taskByNumber = new Map();
const expectedTasks = new Map();
const registrySources = new Set();

for (const filename of taskFiles) {
  const number = filename.slice(0, 4);
  if (taskByNumber.has(number)) {
    report(filename, `duplicate task number ${number}`);
  }
  taskByNumber.set(number, filename);
}

for (const filename of seriesFiles) {
  const markdown = fs.readFileSync(path.join(seriesDirectory, filename), 'utf8');
  const seriesNumber = markdown.match(/^series_number:\s*["']?(\d{4})["']?\s*$/m)?.[1];
  const range = markdown.match(
    /^task_range:\s*\n\s+start:\s*["']?(\d{4})["']?\s*\n\s+end:\s*["']?(\d{4})["']?\s*$/m,
  );
  const sources = [...markdown.matchAll(/^\|\s*([A-Z]+-\d{3})\s*\|/gm)].map(
    (match) => match[1],
  );

  if (!seriesNumber) {
    report(filename, 'missing valid four-digit series_number');
    continue;
  }
  if (!range) {
    report(filename, 'missing valid inclusive task_range');
    continue;
  }

  const start = Number(range[1]);
  const end = Number(range[2]);
  const expectedCount = end - start + 1;
  if (start > end) {
    report(filename, `invalid task_range ${range[1]}-${range[2]}`);
    continue;
  }
  if (sources.length !== expectedCount) {
    report(
      filename,
      `registry has ${sources.length} Source rows but task_range requires ${expectedCount}`,
    );
  }

  for (let index = 0; index < expectedCount; index += 1) {
    const taskNumber = String(start + index).padStart(4, '0');
    const source = sources[index];
    if (expectedTasks.has(taskNumber)) {
      report(filename, `task_range overlaps task ${taskNumber}`);
      continue;
    }
    if (!source) continue;
    if (registrySources.has(source)) {
      report(filename, `duplicate Source ${source} in series registries`);
    }
    registrySources.add(source);
    expectedTasks.set(taskNumber, { seriesNumber, source });
  }
}

for (const [number, expected] of expectedTasks) {
  const filename = taskByNumber.get(number);
  if (!filename) {
    report(`task ${number}`, `missing recipe for Source ${expected.source}`);
    continue;
  }

  const markdown = fs.readFileSync(path.join(taskDirectory, filename), 'utf8');
  const sourceLines = [
    ...markdown.matchAll(/^Source:\s*`([A-Z]+-\d{3})`\s+in Series\s+`(\d{4})`\.\s*$/gm),
  ];
  if (sourceLines.length !== 1) {
    report(filename, `expected exactly one canonical Source line, found ${sourceLines.length}`);
  } else {
    const [, source, seriesNumber] = sourceLines[0];
    if (source !== expected.source) {
      report(filename, `Source ${source} does not match registry Source ${expected.source}`);
    }
    if (seriesNumber !== expected.seriesNumber) {
      report(
        filename,
        `Series ${seriesNumber} does not match owning Series ${expected.seriesNumber}`,
      );
    }
  }

  for (const state of ['DONE', 'BLOCKED']) {
    const markers = [...markdown.matchAll(new RegExp(`^- \\[[ xX]\\] ${state}$`, 'gm'))];
    if (markers.length !== 1) {
      report(filename, `expected exactly one ${state} checkbox, found ${markers.length}`);
    }
  }
  if (/^- \[[xX]\] DONE$/m.test(markdown) && /^- \[[xX]\] BLOCKED$/m.test(markdown)) {
    report(filename, 'DONE and BLOCKED cannot both be checked');
  }

  const requiredHeadings = [
    'Objective',
    'Context',
    'Relevant files and modules',
    'In scope',
    'Out of scope',
    'Decisions already made',
    'Acceptance criteria',
    'Validation',
    'Browser validation',
    'Stop conditions',
    'Dependencies',
    'Execution notes',
  ];
  for (const heading of requiredHeadings) {
    const count = [
      ...markdown.matchAll(new RegExp(`^#{2,3} ${heading}$`, 'gmi')),
    ].length;
    if (count !== 1) {
      report(filename, `expected exactly one ${heading} heading, found ${count}`);
    }
  }
  if (!/^#{2,3} (?:Phase 1 )?Requirements$/im.test(markdown)) {
    report(filename, 'missing Requirements heading');
  }

  const references = [
    ...markdown.matchAll(/\b(\d{4}-[a-z0-9][a-z0-9-]*\.md)\b/g),
  ].map((match) => match[1]);
  for (const reference of references) {
    if (!taskFiles.includes(reference)) {
      report(filename, `task reference points to missing or stale filename ${reference}`);
    }
  }

  const dependencies = section(markdown, 'Dependencies');
  if (dependencies === null) continue;
  for (const dependencyLine of dependencies.split('\n').filter((line) => /^- /.test(line))) {
    const forwardReferences = [
      ...dependencyLine.matchAll(/\b(\d{4})(?:-[a-z0-9][a-z0-9-]*\.md)?\b/g),
    ]
      .map((match) => match[1])
      .filter((dependencyNumber) => Number(dependencyNumber) > Number(number));
    if (forwardReferences.length > 0 && !/^- Advisory:/i.test(dependencyLine)) {
      warnings.push(
        `${filename}: forward reference(s) ${[...new Set(forwardReferences)].join(', ')} should be explicitly advisory or reviewed as a recipe defect`,
      );
    }
  }
}

for (const [number, filename] of taskByNumber) {
  if (!expectedTasks.has(number)) {
    report(filename, 'recipe is outside every real Series task_range');
  }
}

const sortedExpected = [...expectedTasks.keys()].sort();
for (let index = 1; index < sortedExpected.length; index += 1) {
  if (Number(sortedExpected[index]) !== Number(sortedExpected[index - 1]) + 1) {
    report(
      'series registry',
      `non-contiguous task numbers ${sortedExpected[index - 1]} -> ${sortedExpected[index]}`,
    );
  }
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR ${error}`);
  }
  console.error(`Recipe validation failed with ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  const doneCount = taskFiles.filter((filename) =>
    /^- \[[xX]\] DONE$/m.test(fs.readFileSync(path.join(taskDirectory, filename), 'utf8')),
  ).length;
  const blockedCount = taskFiles.filter((filename) =>
    /^- \[[xX]\] BLOCKED$/m.test(fs.readFileSync(path.join(taskDirectory, filename), 'utf8')),
  ).length;
  console.log(
    `Recipe validation passed: ${seriesFiles.length} series, ${taskFiles.length} tasks, ${registrySources.size} Sources, ${doneCount} DONE, ${blockedCount} BLOCKED, ${warnings.length} warning(s).`,
  );
}
