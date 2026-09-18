#!/usr/bin/env node

import process from 'node:process';

const repository = process.env.GITHUB_REPOSITORY ?? 'giuliomarinelli/MercurionWeb';
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;

if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required');

const response = await fetch(`https://api.github.com/repos/${repository}/rulesets`, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'mercurion-policy-assertion',
  },
});
if (!response.ok) throw new Error(`Ruleset read failed: HTTP ${response.status}`);

const summaries = await response.json();
const summary = summaries.find((entry) => entry.name === 'Protect develop');
if (!summary) throw new Error('Missing repository ruleset: Protect develop');

const detailResponse = await fetch(
  `https://api.github.com/repos/${repository}/rulesets/${summary.id}`,
  { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'mercurion-policy-assertion' } },
);
if (!detailResponse.ok) throw new Error(`Ruleset detail read failed: HTTP ${detailResponse.status}`);
const ruleset = await detailResponse.json();

const failures = [];
if (ruleset.enforcement !== 'active') failures.push('enforcement must be active');
if (ruleset.bypass_actors?.length) failures.push('bypass actors must be empty');
const include = ruleset.conditions?.ref_name?.include ?? [];
if (!include.includes('refs/heads/develop') && !include.includes('~DEFAULT_BRANCH')) {
  failures.push('develop must be included');
}
for (const type of ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']) {
  if (!ruleset.rules?.some((rule) => rule.type === type)) failures.push(`missing ${type} rule`);
}
const pullRequest = ruleset.rules?.find((rule) => rule.type === 'pull_request')?.parameters;
if ((pullRequest?.required_approving_review_count ?? 0) < 1) failures.push('one approving review is required');
if (pullRequest?.required_review_thread_resolution !== true) failures.push('review threads must be resolved');
const status = ruleset.rules?.find((rule) => rule.type === 'required_status_checks')?.parameters;
if (status?.strict_required_status_checks_policy !== true) failures.push('strict status checks must be enabled');
if (!status?.required_status_checks?.some((check) => check.context === 'Required gate')) {
  failures.push('Required gate must be required');
}

if (failures.length) throw new Error(`Develop protection drift: ${failures.join('; ')}`);
console.log(`Develop protection verified via ruleset ${ruleset.id}`);
