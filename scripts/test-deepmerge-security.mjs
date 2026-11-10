import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readJson = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const alias = 'npm:@shivammathur/deepmerge@4.3.2'
const integrity = 'sha512-OBZnBsXwbBITC90wXf9Ph8W7OAUkhFdM+BGRYeIQwt5nILxy5wkk2plUoabi9Yp6xm0c/Yv9PuLiGBXnfizAMA=='

for (const prefix of ['', 'MercurionData/']) {
  assert.equal(readJson(`${prefix}package.json`).overrides.deepmerge, alias)
  const entries = Object.entries(readJson(`${prefix}package-lock.json`).packages)
    .filter(([path]) => path.endsWith('node_modules/deepmerge'))
  assert.ok(entries.length > 0, `missing merge dependency in ${prefix || 'workspace'}`)
  for (const [path, entry] of entries) {
    assert.equal(entry.name, '@shivammathur/deepmerge', path)
    assert.equal(entry.version, '4.3.2', path)
    assert.equal(entry.integrity, integrity, path)
  }
}

// Resolve from the real consumers: npm may keep the aliases nested rather than hoisted.
const require = createRequire(import.meta.url)
for (const consumer of ['jest-config', 'fork-ts-checker-webpack-plugin']) {
  const consumerRequire = createRequire(require.resolve(consumer))
  const merge = consumerRequire('deepmerge')
  assert.equal(consumerRequire('deepmerge/package.json').name, '@shivammathur/deepmerge')

  const poisoned = JSON.parse('{"__proto__":{"unexpected":true},"safe":{"value":1}}')
  const nullPrototype = Object.assign(Object.create(null), poisoned)
  for (const [target, source] of [[poisoned, {}], [nullPrototype, poisoned], [{}, poisoned]]) {
    const actual = merge(target, source)
    assert.equal(Object.getPrototypeOf(actual), Object.prototype, consumer)
    assert.equal(actual.unexpected, undefined, consumer)
    assert.equal(Object.hasOwn(actual, '__proto__'), false, consumer)
    assert.deepEqual(actual.safe, { value: 1 })
  }
  const nested = merge({ list: [] }, { list: [poisoned] })
  assert.equal(Object.getPrototypeOf(nested.list[0]), Object.prototype)
  assert.equal(nested.list[0].unexpected, undefined)
  assert.equal({}.unexpected, undefined)

  const left = { nested: { first: true }, list: [1] }
  const right = { nested: { second: true }, list: [2], enabled: false }
  const actual = merge(left, right)
  assert.deepEqual(actual, { nested: { first: true, second: true }, list: [1, 2], enabled: false })
  assert.notEqual(actual.nested, left.nested)
  assert.deepEqual(left, { nested: { first: true }, list: [1] })
  assert.deepEqual(merge(left, right, { arrayMerge: (_target, source) => source }).list, [2])
  assert.deepEqual(merge.all([{ first: 1 }, { second: 2 }]), { first: 1, second: 2 })
  assert.deepEqual(merge({ count: 1 }, { count: 2 }, {
    customMerge: key => key === 'count' ? (a, b) => a + b : undefined,
    isMergeableObject: value => value !== null && typeof value === 'object' || typeof value === 'number'
  }).count, 3)
  const symbol = Symbol('configuration')
  assert.equal(merge({}, { [symbol]: true })[symbol], true)
  const date = new Date(0)
  assert.equal(merge({}, { date }).date, date)
}
console.log('Deepmerge security and configuration compatibility passed for both tooling consumers.')
