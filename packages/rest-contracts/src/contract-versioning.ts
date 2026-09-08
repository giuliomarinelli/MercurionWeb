export type ContractMajor = number

export interface SupportedMajorRange {
  readonly minimum: ContractMajor
  readonly maximum: ContractMajor
}

export interface DeprecationMetadata {
  readonly deprecatedInMajor: ContractMajor
  readonly reason: string
  readonly deprecatedAt: string
  readonly replacement?: string
  readonly removeNoEarlierThanMajor: ContractMajor
  readonly approvalAuthority: string
}

export const CURRENT_CONTRACT_MAJOR = 1 as const
export const SUPPORTED_CONTRACT_MAJOR_RANGE: SupportedMajorRange = Object.freeze({
  minimum: 1,
  maximum: 1
})
export const CONTRACT_VERSION_HEADER = 'x-mercurion-contract-major' as const

export const PUBLIC_CONTRACT_VERSION_METADATA = Object.freeze({
  currentMajor: CURRENT_CONTRACT_MAJOR,
  supportedMajorRange: SUPPORTED_CONTRACT_MAJOR_RANGE,
  rest: Object.freeze({ legacyPathPrefix: '/api/', legacyMajor: 1 }),
  graphql: Object.freeze({ endpoint: '/api/graphql', selection: 'header' }),
  socketIo: Object.freeze({ handshakeField: 'contractMajor' }),
  deprecations: Object.freeze([] as readonly DeprecationMetadata[])
})

export type ContractVersionSelection =
  | { readonly kind: 'legacy-unversioned'; readonly selectedMajor: 1 }
  | { readonly kind: 'supported' | 'deprecated'; readonly selectedMajor: ContractMajor; readonly deprecation?: DeprecationMetadata }
  | { readonly kind: 'invalid'; readonly code: 'CONTRACT_VERSION_INVALID' }
  | { readonly kind: 'unsupported'; readonly code: 'CONTRACT_VERSION_UNSUPPORTED'; readonly selectedMajor: ContractMajor }

export function negotiateContractMajor(value: unknown): ContractVersionSelection {
  if (value === undefined || value === null) {
    return { kind: 'legacy-unversioned', selectedMajor: CURRENT_CONTRACT_MAJOR }
  }

  if (Array.isArray(value) || (typeof value !== 'number' && typeof value !== 'string')) {
    return { kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' }
  }

  const raw = typeof value === 'number' ? value : value.trim()
  if (
    raw === '' ||
    (typeof raw === 'string' && !/^[1-9]\d*$/.test(raw)) ||
    (typeof raw === 'number' && (!Number.isSafeInteger(raw) || raw <= 0))
  ) {
    return { kind: 'invalid', code: 'CONTRACT_VERSION_INVALID' }
  }

  const selectedMajor = Number(raw)
  if (
    !Number.isSafeInteger(selectedMajor) ||
    selectedMajor < SUPPORTED_CONTRACT_MAJOR_RANGE.minimum ||
    selectedMajor > SUPPORTED_CONTRACT_MAJOR_RANGE.maximum
  ) {
    return { kind: 'unsupported', code: 'CONTRACT_VERSION_UNSUPPORTED', selectedMajor }
  }

  const deprecation = PUBLIC_CONTRACT_VERSION_METADATA.deprecations.find(
    (item) => item.deprecatedInMajor === selectedMajor
  )
  return deprecation
    ? { kind: 'deprecated', selectedMajor, deprecation }
    : { kind: 'supported', selectedMajor }
}

export function restMajorFromPath(path: string): ContractVersionSelection {
  const versioned = path.match(/^\/api\/v([^/]+)(?:\/|$)/i)
  return versioned ? negotiateContractMajor(versioned[1]) : negotiateContractMajor(undefined)
}

export function contractVersionDetails(selection: ContractVersionSelection) {
  return {
    ...(selection.kind === 'legacy-unversioned' || selection.kind === 'invalid'
      ? selection.kind === 'legacy-unversioned' ? { legacyUnversioned: true } : {}
      : { selectedMajor: selection.selectedMajor }),
    currentMajor: CURRENT_CONTRACT_MAJOR,
    supportedMajorRange: SUPPORTED_CONTRACT_MAJOR_RANGE,
    ...(selection.kind === 'deprecated' ? { deprecation: selection.deprecation } : {})
  } as const
}
