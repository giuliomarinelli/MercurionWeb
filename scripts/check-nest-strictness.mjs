import fs from 'node:fs'

const tsconfigPath = 'MercurionWebNode/tsconfig.json'
const tsconfig = fs.readFileSync(tsconfigPath, 'utf8')

const requiredOptions = [
  ['strict', true],
  ['noImplicitAny', true],
  ['useUnknownInCatchVariables', true],
  ['strictBindCallApply', true],
  ['noFallthroughCasesInSwitch', true],
]

const violations = requiredOptions
  .filter(([option, expected]) => {
    const match = tsconfig.match(new RegExp(`"${option}"\\s*:\\s*(true|false)`))
    return !match || match[1] !== String(expected)
  })
  .map(([option, expected]) => `"${option}" must be ${expected}`)

if (/"(?:strict|noImplicitAny|useUnknownInCatchVariables|strictBindCallApply|noFallthroughCasesInSwitch)"\s*:\s*false/.test(tsconfig)) {
  violations.push('Nest tsconfig contains a disabled strictness option')
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exit(1)
}

console.log('Nest strictness policy passed.')
