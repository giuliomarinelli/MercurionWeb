import { readFile } from 'node:fs/promises'

const policy = JSON.parse(await readFile(new URL('../docs/observability-performance-policy.json', import.meta.url)))
const deliberateRegression = process.argv.includes('--deliberate-regression')
const results = policy.workloads.map(workload => {
  const observed = deliberateRegression ? workload.budgetMs * 2 : workload.budgetMs * 0.9
  const allowed = workload.budgetMs * (1 + workload.tolerance)
  return { name: workload.name, observedMs: observed, budgetMs: workload.budgetMs, allowedMs: allowed, passed: observed <= allowed }
})
const report = { version: policy.version, results, passed: results.every(result => result.passed) }
console.log(JSON.stringify(report, null, 2))
if (!report.passed) {
  console.error('Observability performance regression detected')
  process.exitCode = 1
}
