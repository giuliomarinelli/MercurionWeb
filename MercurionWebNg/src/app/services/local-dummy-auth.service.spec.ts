import { LOCAL_DUMMY_AUTH } from '@mercurion/rest-contracts'

import { createAppConfig } from '../config/app-config'
import { environment as developmentEnvironment } from '../../environments/environment.development'
import { environment as productionEnvironment } from '../../environments/environment'
import { environment as stagingEnvironment } from '../../environments/environment.staging'
import { canUseLocalDummyAuth } from './local-dummy-auth.service'

describe('local dummy authentication boundary', () => {
  it('is available only for the development build at the canonical nginx origin', () => {
    expect(canUseLocalDummyAuth(
      createAppConfig(developmentEnvironment),
      LOCAL_DUMMY_AUTH.canonicalOrigin
    )).toBeTrue()

    expect(canUseLocalDummyAuth(
      createAppConfig(developmentEnvironment),
      'http://localhost:3498'
    )).toBeFalse()
    expect(canUseLocalDummyAuth(
      createAppConfig(stagingEnvironment),
      LOCAL_DUMMY_AUTH.canonicalOrigin
    )).toBeFalse()
    expect(canUseLocalDummyAuth(
      createAppConfig(productionEnvironment),
      LOCAL_DUMMY_AUTH.canonicalOrigin
    )).toBeFalse()
  })

  it('exposes the activation route only in the development public routes', () => {
    expect(developmentEnvironment.PUBLIC_EXACT_PATHS).toContain('/__local/dummy-auth')
    expect(stagingEnvironment.PUBLIC_EXACT_PATHS).not.toContain('/__local/dummy-auth')
    expect(productionEnvironment.PUBLIC_EXACT_PATHS).not.toContain('/__local/dummy-auth')
  })
})
