import { ChemistryEditorTab } from './chemistry-adapter.models'

export interface KetcherEditorProfile {
  readonly disableMacromoleculesEditor: boolean
  readonly hiddenControls: readonly string[]
}

const COMMON_HIDDEN_CONTROLS = [
  // Mercurion owns persistence/reset semantics.
  'clear',
  'open',
  'save',

  // Keep ordinary copy/cut/paste in the standard profile, but remove
  // vendor-specific export variants.
  'copy-mol',
  'copy-ket',
  'copy-image',

  // Chemistry utilities duplicated by Mercurion/RDKit or outside the
  // molecule-editing workflow.
  'arom',
  'dearom',
  'cip',
  'check',
  'analyse',
  'explicit-hydrogens',
  'recognize',
  'miew',

  // Embedded-system chrome.
  'settings',
  'help',
  'about',

  // Out-of-scope structure domains.
  'sgroup',
  'reaction-plus',
  'arrows',
  'reaction-mapping-tools',
  'reaction-automap',
  'reaction-map',
  'reaction-unmap',
  'rgroup',
  'rgroup-label',
  'rgroup-fragment',
  'rgroup-attpoints',
  'shape',
  'shapes',
  'shape-ellipse',
  'shape-rectangle',
  'shape-line',
  'text',
  'enhanced-stereo',
  'create-monomer'
] as const

const LIVE_ANALYSIS_EXTRA_HIDDEN_CONTROLS = [
  // The live layout prioritizes fast structural edits beside analysis panes.
  'copies',
  'paste',
  'cut',

  // Keep only Clean Up from Ketcher's external chemistry actions. At least one
  // external action remains visible because Ketcher collapses this group on
  // narrower editor widths.
  'layout',

  // Secondary chrome that costs horizontal space in the compact editor.
  'fullscreen',
  'zoom-list',

  // Useful in the full editor, but expendable in the compact live workflow.
  'functional-groups',
  'template-lib',
  'transform-rotate',
  'transform-flip-h',
  'transform-flip-v'
] as const

export const KETCHER_EDITOR_PROFILES: Readonly<Record<ChemistryEditorTab, KetcherEditorProfile>> = {
  std: {
    disableMacromoleculesEditor: true,
    hiddenControls: COMMON_HIDDEN_CONTROLS
  },
  live: {
    disableMacromoleculesEditor: true,
    hiddenControls: [
      ...COMMON_HIDDEN_CONTROLS,
      ...LIVE_ANALYSIS_EXTRA_HIDDEN_CONTROLS
    ]
  }
}

export function buildKetcherResourceUrl(baseUrl: string, tab: ChemistryEditorTab): string {
  const profile = KETCHER_EDITOR_PROFILES[tab]
  const params = new URLSearchParams({
    disableMacromoleculesEditor: String(profile.disableMacromoleculesEditor),
    hiddenControls: profile.hiddenControls.join(',')
  })

  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}${params.toString()}`
}
