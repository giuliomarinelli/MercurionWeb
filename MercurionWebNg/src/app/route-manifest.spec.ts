import { routeManifest, validateRouteManifest } from './route-manifest'

describe('route manifest', () => {
  it('contains unique route identities and paths', () => {
    expect(() => validateRouteManifest()).not.toThrow()
    const descriptors = Object.values(routeManifest)
    expect(new Set(descriptors.map(route => route.id)).size).toBe(descriptors.length)
    expect(new Set(descriptors.map(route => route.path)).size).toBe(descriptors.length)
  })

  it('builds encoded parameterized routes', () => {
    expect(routeManifest.moleculeDetail.build({ molId: 'chembl/123' })).toBe('/molecules/detail/chembl%2F123')
    expect(routeManifest.collectionDetail.build({ colId: 'collection 123' })).toBe('/molecules/collections/detail/collection%20123')
    expect(routeManifest.adminMaintenance.build({ token: 'maintenance token' })).toBe('/admin/maintenance/maintenance%20token')
  })

  it('rejects missing parameter values', () => {
    expect(() => routeManifest.moleculeDetail.build({ molId: '' })).toThrowError(/Missing route parameter "molId"/)
  })
})
