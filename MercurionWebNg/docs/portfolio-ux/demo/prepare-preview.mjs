import { readFileSync } from 'node:fs'
import { loadDataset, validateDataset } from './validate.mjs'

const [dataset, snapshots] = loadDataset()
validateDataset(dataset, snapshots)
const helper = readFileSync(new URL('./preview.mjs', import.meta.url), 'utf8')
  .replace('export async function', 'async function')

// Send stdout as browser_run_code_unsafe.code in Playwright MCP, never to a shell.
// The resulting page is read-only. Closing it discards all demo transport fixtures.
process.stdout.write(`async (page) => {
  ${helper}
  const preview = await openDemoPreview(page, ${JSON.stringify(dataset)}, ${JSON.stringify(snapshots)})
  preview.tab._demo25State = preview
  return { preview: true, collections: preview.collections.length, molecules: preview.items.length }
}`)
