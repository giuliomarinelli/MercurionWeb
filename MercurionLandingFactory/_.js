const fs = require('node:fs')
const path = require('node:path')

const httpErrorPages = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './src/app/data/http-error-pages.json'), 'utf-8'))

const codes = Array.from(
  new Set(
    httpErrorPages
      .map((e) => e.code)
      .filter((code) => typeof code === 'number')
  )
).sort((a, b) => a - b)

// Ogni codice diventa una route tipo "/404"
const routes = codes.map((code) => `/${code}`)

// Scriviamo il file di testo, una route per riga
const outPath = path.resolve(process.cwd(), 'prerender-routes.txt')

fs.writeFileSync(outPath, routes.join('\n') + '\n', 'utf8')

console.log('Generated prerender-routes.txt with routes:')
console.log(routes)
