import { ChemistryAdapterError, ChemistryRenderRequest } from '../chemistry-adapter.models'
import {
  RdKitApplicationModule,
  RdKitMolecule,
  RdKitRendererSession
} from './rdkit-renderer.adapter'

describe('RdKitRendererSession', () => {
  let molecule: jasmine.SpyObj<RdKitMolecule>
  let rdkit: jasmine.SpyObj<RdKitApplicationModule>
  let session: RdKitRendererSession

  beforeEach(() => {
    molecule = jasmine.createSpyObj<RdKitMolecule>(
      'RdKitMolecule',
      ['delete', 'get_descriptors', 'get_molblock', 'get_svg_with_highlights', 'is_valid']
    )
    molecule.is_valid.and.returnValue(true)
    molecule.get_svg_with_highlights.and.returnValue('<svg></svg>')
    rdkit = jasmine.createSpyObj<RdKitApplicationModule>('RdKitApplicationModule', ['get_mol'])
    rdkit.get_mol.and.returnValue(molecule)
    session = new RdKitRendererSession(rdkit)
  })

  it('releases each rendered molecule exactly once after success', async () => {
    await expectAsync(session.renderSvg(renderRequest())).toBeResolvedTo('<svg></svg>')

    expect(molecule.delete).toHaveBeenCalledTimes(1)
  })

  it('releases each rendered molecule exactly once when rendering throws', async () => {
    molecule.get_svg_with_highlights.and.throwError('vendor render failure')

    await expectAsync(session.renderSvg(renderRequest())).toBeRejectedWith(
      jasmine.objectContaining<Partial<ChemistryAdapterError>>({
        code: 'operation-failed'
      })
    )

    expect(molecule.delete).toHaveBeenCalledTimes(1)
  })

  it('releases a molecule exactly once when vendor validation throws', async () => {
    molecule.is_valid.and.throwError('vendor validation failure')

    await expectAsync(session.renderSvg(renderRequest())).toBeRejectedWith(
      jasmine.objectContaining<Partial<ChemistryAdapterError>>({
        code: 'invalid-structure'
      })
    )

    expect(molecule.delete).toHaveBeenCalledTimes(1)
    expect(molecule.get_svg_with_highlights).not.toHaveBeenCalled()
  })

  it('releases a molecule exactly once when vendor validation rejects it', async () => {
    molecule.is_valid.and.returnValue(false)

    await expectAsync(session.renderSvg(renderRequest())).toBeRejectedWith(
      jasmine.objectContaining<Partial<ChemistryAdapterError>>({
        code: 'invalid-structure'
      })
    )

    expect(molecule.delete).toHaveBeenCalledTimes(1)
    expect(molecule.get_svg_with_highlights).not.toHaveBeenCalled()
  })

  it('rejects new work after disposal without acquiring a molecule', async () => {
    session.dispose()

    await expectAsync(session.renderSvg(renderRequest())).toBeRejectedWith(
      jasmine.objectContaining<Partial<ChemistryAdapterError>>({
        code: 'unavailable',
        recoverable: false
      })
    )

    expect(rdkit.get_mol).not.toHaveBeenCalled()
  })

  function renderRequest(): ChemistryRenderRequest {
    return {
      structure: 'CC',
      options: {
        background: [1, 1, 1],
        bond: [0, 0, 0],
        atomPalette: {},
        fixedBondLength: 50
      }
    }
  }
})
