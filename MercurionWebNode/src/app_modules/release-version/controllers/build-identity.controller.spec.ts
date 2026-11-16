import { BuildIdentityController } from './build-identity.controller'

describe('BuildIdentityController', () => {
  it('exposes only the safe deterministic public identity', () => {
    const identity = new BuildIdentityController().getBuildIdentity()

    expect(identity.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(identity.revision).toMatch(/^[0-9a-f]{40}$/)
    expect(Object.keys(identity)).toEqual(['version', 'revision'])
  })
})
