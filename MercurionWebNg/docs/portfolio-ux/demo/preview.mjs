// Transport fixtures for one disposable Playwright MCP tab. Never import into the app.
export async function openDemoPreview(page, dataset, snapshots) {
  const origin = 'http://localhost:8888'
  if (new URL(page.url()).origin !== origin) {
    throw new Error('Open localhost:8888 before installing the local demo')
  }

  const tab = await page.context().newPage()
  tab._demo25 = true
  const at = String(Date.parse(`${dataset.snapshotDate}T10:00:00Z`))
  const instant = `${dataset.snapshotDate}T10:00:00.000Z`
  const uuid = index => `25000000-0000-4000-8000-${String(index).padStart(12, '0')}`
  const sources = new Map(snapshots.map(source => [source.record.molecule_chembl_id, source.record]))
  const collections = dataset.collections.map((collection, index) => ({
    ...collection,
    id: uuid(index + 1),
    createdAt: at,
    updatedAt: at,
    touchedAt: at,
    itemsCount: collection.moleculeKeys.length
  }))
  const items = dataset.molecules.map((molecule, index) => {
    const record = sources.get(molecule.source)
    const properties = record.properties
    const custom = molecule.type === 'custom'
    return {
      __typename: custom ? 'CustomMoleculeItemDTO' : 'ChEMBLMoleculeItemDTO',
      id: uuid(index + 101),
      type: custom ? 'custom' : 'chembl',
      label: null,
      notes: molecule.notes,
      createdAt: at,
      updatedAt: at,
      touchedAt: at,
      joins: collections.filter(collection => collection.moleculeKeys.includes(molecule.key))
        .map((collection, joinIndex) => ({ id: uuid(index * 10 + joinIndex + 301), collection })),
      ...(custom ? {
        name: molecule.displayName,
        canonicalSmiles: record.canonical_smiles,
        molFormula: properties.full_molformula,
        propertiesJson: null
      } : {
        // These IDs exist only in the intercepted catalogue, never in a real database.
        chemblMolregno: 250001 + index,
        chemblDetails: {
          id: 250001 + index,
          cmbId: Number(molecule.source.replace('CHEMBL', '')),
          preferredName: record.pref_name,
          preferredNameIt: molecule.displayName,
          canonicalSmiles: record.canonical_smiles,
          moleculeType: record.molecule_type,
          maxPhase: record.max_phase === null ? null : Number(record.max_phase),
          naturalProduct: record.natural_product,
          prodrug: record.prodrug,
          blackBoxWarning: record.black_box_warning,
          synonyms: [],
          properties: Object.fromEntries(['mwFreebase', 'alogp', 'hba', 'hbd', 'psa', 'rtb'].map(key => {
            const value = properties[key === 'mwFreebase' ? 'mw_freebase' : key]
            return [key, value === null ? null : Number(value)]
          })),
          administrationRoutes: { oral: record.oral, parenteral: record.parenteral, topical: record.topical }
        }
      })
    }
  })
  const notifications = dataset.notifications.map((notification, index) => ({
    id: uuid(index + 501),
    type: 'demo.portfolio',
    category: 'demo',
    version: 1,
    title: notification.title,
    summary: notification.summary,
    body: notification.body,
    payload: {},
    resourceType: null,
    resourceId: null,
    createdAt: instant,
    updatedAt: instant,
    seenAt: instant,
    readAt: notification.read ? instant : null,
    dismissedAt: null
  }))
  const paginated = (values, variables = {}) => {
    const limit = Math.max(1, Number(variables.limit) || 25)
    const currentPage = Math.max(1, Number(variables.page) || 1)
    const query = String(variables.q ?? '').toLocaleLowerCase('it')
    const filtered = values.filter(value =>
      (value.name ?? value.chemblDetails?.preferredNameIt ?? '').toLocaleLowerCase('it').includes(query))
    const slice = filtered.slice((currentPage - 1) * limit, currentPage * limit)
    return {
      items: slice, itemCount: slice.length, totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / limit), itemsPerPage: limit, currentPage
    }
  }
  const log = { served: [], blocked: [] }
  await tab.route(`${origin}/api/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const reply = json => route.fulfill({ status: 200, json })
    const block = async name => {
      log.blocked.push(name)
      await route.fulfill({ status: 403, json: { message: 'Demo25: operation disabled in read-only preview' } })
    }

    if (path === '/api/graphql') {
      const body = request.postDataJSON()
      if (Array.isArray(body) || !body || /\bmutation\b/.test(body.query ?? '')) {
        return block('GraphQL write/batch')
      }
      const variables = body.variables ?? {}
      const handlers = {
        PaginatedCollections: () => ({ myMoleculeCollectionsPaginated: paginated(collections, variables) }),
        MyMoleculeCollections: () => ({ myMoleculeCollections: collections }),
        PaginatedMoleculeCollectionItemsByUser: () => ({ paginatedMoleculeCollectionItemsByUser: paginated(items, variables) }),
        PaginatedMoleculeCollectionItemsByCollection: () => ({
          paginatedMoleculeCollectionItemsByCollection: paginated(items.filter(item =>
            item.joins.some(join => join.collection.id === variables.collectionId)), variables)
        }),
        MyMoleculeItems: () => ({ myMoleculeItems: items }),
        MoleculeItemBasicData: () => ({ myMoleculeItems: items })
      }
      if (!Object.hasOwn(handlers, body.operationName)) return block(`GraphQL ${body.operationName ?? 'anonymous'}`)
      log.served.push(body.operationName)
      return reply({ data: handlers[body.operationName]() })
    }

    if (path.startsWith('/api/notifications')) {
      if (request.method() !== 'GET') return block(`notification ${request.method()}`)
      if (path.endsWith('/recovery')) return reply({
        cursor: 'demo25', snapshotAt: instant, unreadCount: 1, unseenCount: 0, changes: [], hasMore: false
      })
      if (path === '/api/notifications') return reply({
        items: url.searchParams.get('state') === 'unread'
          ? notifications.filter(notification => !notification.readAt) : notifications,
        nextCursor: null
      })
      const notification = notifications.find(value => path.endsWith(`/${value.id}`))
      return notification ? reply(notification) : block('unknown notification')
    }
    if (path === '/api/history' && request.method() === 'GET') return reply(paginated([]))
    // Authentication/bootstrap GETs remain real. No token/cookie is read by this helper.
    if (request.method() === 'GET' && !path.startsWith('/api/account/profile-registry')) return route.continue()
    return block(`${request.method()} ${path}`)
  })
  await tab.goto(`${origin}/molecules/collections`, { waitUntil: 'domcontentloaded' })
  return { tab, log, collections, items }
}
