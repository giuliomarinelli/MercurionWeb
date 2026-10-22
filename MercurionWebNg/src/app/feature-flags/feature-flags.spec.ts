import { routes } from '../app.routes'
import { routeManifest } from '../route-manifest'
import { environmentNames } from '../../environments/environment.config'
import { FEATURE_FLAGS, isFeatureEnabled } from './feature-flags'

describe('Mercurion 1.0.0 beta deferred feature flags', () => {
  it('disables all three deferred features across all four Angular environments', () => {
    expect(environmentNames).toEqual(['development', 'testing', 'staging', 'production'])
    for (const env of environmentNames) {
      expect(FEATURE_FLAGS[env]).toEqual({
        notebook: false,
        synthesis: false,
        documents: false
      })
    }
    expect(isFeatureEnabled('notebook')).toBe(false)
    expect(isFeatureEnabled('synthesis')).toBe(false)
    expect(isFeatureEnabled('documents')).toBe(false)
  })

  it('omits all three Notebook routes from Angular router registration', () => {
    const unavailablePaths = [
      routeManifest.notebook.path,
      routeManifest.notebookReader.path,
      routeManifest.notebookEditor.path
    ]
    for (const path of unavailablePaths) {
      expect(routes.some(route => route.path === path)).toBe(false)
    }
    expect(routes.some(route => route.path === routeManifest.notFound.path)).toBe(true)
    expect(routes.some(route => route.path === routeManifest.wildcard.path)).toBe(true)
  })

  it('hides deferred Notebook navigation without erasing its route manifest', () => {
    expect(routeManifest.notebook.navigation).toBeUndefined()
    expect(routeManifest.notebook.build({})).toBe('/notebook')
  })

  it('does not register standalone Synthesis or Documents routes', () => {
    const paths = routes.map(route => route.path ?? '')
    expect(paths.some(path => /^(synthesis|synth|documents)(\/|$)/.test(path))).toBe(false)
  })
})
