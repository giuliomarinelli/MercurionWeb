import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const result = spawnSync(process.execPath, [
  resolve('node_modules', 'jscpd', 'bin', 'jscpd'),
  '--config=.jscpd.json',
  '--formats-exts=typescript:ts;markup:html;css:css',
  '--reporters=console,html',
  '--output=reports/duplication',
  '--ignore=**/*.spec.ts,**/test.ts,**/test-setup.ts,**/generated/**,**/graphql/documents/**,**/schema.graphql,**/schema.gql,**/assets/**',
  'MercurionWebNg/src',
  'MercurionWebNode/src'
], {
  stdio: 'inherit',
  shell: false
})

if (result.error) {
  console.error(`Unable to run the pinned jscpd executable: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
