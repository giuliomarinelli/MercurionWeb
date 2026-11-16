import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function validateDataset(dataset, snapshots) {
  assert.equal(dataset.version, 1)
  assert.equal(dataset.namespace, 'Demo25')
  const sourceMap = new Map(snapshots.map(source => [source.record.molecule_chembl_id, source]))
  assert.equal(sourceMap.size, 3)
  const expected = {
    CHEMBL25: ['ASPIRIN', 'C9H8O4', '180.16', 'CC(=O)Oc1ccccc1C(=O)O'],
    CHEMBL113: ['CAFFEINE', 'C8H10N4O2', '194.19', 'Cn1c(=O)c2c(ncn2C)n(C)c1=O'],
    CHEMBL112: ['ACETAMINOPHEN', 'C8H9NO2', '151.16', 'CC(=O)Nc1ccc(O)cc1']
  }
  for (const [id, values] of Object.entries(expected)) {
    const source = sourceMap.get(id)
    assert.ok(source, `Missing source ${id}`)
    assert.equal(source.url, `https://www.ebi.ac.uk/chembl/api/data/molecule/${id}.json`)
    assert.equal(source.retrievedOn, dataset.snapshotDate)
    const record = source.record
    assert.deepEqual([
      record.pref_name, record.properties.full_molformula,
      record.properties.mw_freebase, record.canonical_smiles
    ], values, `Source identity changed for ${id}: review against the upstream record`)
    for (const property of ['mw_freebase', 'alogp', 'hba', 'hbd', 'psa', 'rtb']) {
      assert.ok(record.properties[property] !== null && Number.isFinite(Number(record.properties[property])))
    }
  }
  const keys = dataset.molecules.map(molecule => molecule.key)
  assert.equal(new Set(keys).size, keys.length, 'Duplicate molecule key')
  assert.equal(keys.length, 4)
  for (const molecule of dataset.molecules) {
    assert.ok(sourceMap.has(molecule.source), `Unknown source for ${molecule.key}`)
    assert.ok(molecule.displayName.trim() && molecule.notes.trim())
    // Structure/properties come only from the source snapshot, never an independent copy.
    assert.equal(molecule.canonicalSmiles, undefined)
    assert.equal(molecule.properties, undefined)
    assert.equal(molecule.t1Inference, undefined)
  }
  assert.equal(dataset.molecules.filter(molecule => molecule.omitProperties).length, 1)
  assert.equal(new Set(dataset.collections.map(collection => collection.key)).size, dataset.collections.length)
  assert.ok(dataset.collections.some(collection => collection.moleculeKeys.length === 0))
  assert.ok(dataset.collections.some(collection => collection.name.length > 70))
  for (const collection of dataset.collections) {
    assert.ok(collection.name.includes(dataset.namespace) && collection.name.length <= 255)
    assert.equal(new Set(collection.moleculeKeys).size, collection.moleculeKeys.length)
    for (const key of collection.moleculeKeys) assert.ok(keys.includes(key), `Dangling collection member ${key}`)
  }
  assert.ok(dataset.notifications.some(notification => notification.read))
  assert.ok(dataset.notifications.some(notification => !notification.read))
  for (const notification of dataset.notifications) {
    assert.ok(notification.title.includes('[Demo25]'))
    assert.ok(notification.body.includes('sintetico'))
    assert.equal(notification.resourceId, undefined)
  }
}

export function loadDataset() {
  return [
    JSON.parse(readFileSync(new URL('./dataset.json', import.meta.url), 'utf8')),
    JSON.parse(readFileSync(new URL('./chembl-snapshot.json', import.meta.url), 'utf8'))
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateDataset(...loadDataset())
  console.log('Demo25: source identity, properties, references and edge cases validated')
}
