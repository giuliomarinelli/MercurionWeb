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

export interface ContractVersionPolicy {
  readonly currentMajor: ContractMajor
  readonly supportedMajorRange: SupportedMajorRange
  readonly deprecations: readonly DeprecationMetadata[]
}

export const CURRENT_CONTRACT_MAJOR = 1 as const
export const SUPPORTED_CONTRACT_MAJOR_RANGE: SupportedMajorRange = Object.freeze({
  minimum: 1,
  maximum: 1
})
export const CONTRACT_VERSION_HEADER = 'x-mercurion-contract-major' as const
export const CONTRACT_VERSION_RESPONSE_HEADERS = Object.freeze({
  currentMajor: 'x-mercurion-contract-current-major',
  supportedMajorRange: 'x-mercurion-contract-supported-range'
})
export const LEGACY_UNVERSIONED_CONTRACT_WARNING =
  '299 - "legacy-unversioned contract; explicit major required"' as const

export const PUBLIC_CONTRACT_VERSION_METADATA = Object.freeze({
  currentMajor: CURRENT_CONTRACT_MAJOR,
  supportedMajorRange: SUPPORTED_CONTRACT_MAJOR_RANGE,
  rest: Object.freeze({ legacyPathPrefix: '/api/', legacyMajor: 1 }),
  graphql: Object.freeze({ endpoint: '/api/graphql', selection: 'header' }),
  socketIo: Object.freeze({ handshakeField: 'contractMajor' }),
  responseHeaders: CONTRACT_VERSION_RESPONSE_HEADERS,
  deprecations: Object.freeze([] as readonly DeprecationMetadata[])
})

export type ContractVersionSelection =
  | { readonly kind: 'legacy-unversioned'; readonly selectedMajor: ContractMajor }
  | { readonly kind: 'supported' | 'deprecated'; readonly selectedMajor: ContractMajor; readonly deprecation?: DeprecationMetadata }
  | { readonly kind: 'invalid'; readonly code: 'CONTRACT_VERSION_INVALID' }
  | { readonly kind: 'unsupported'; readonly code: 'CONTRACT_VERSION_UNSUPPORTED'; readonly selectedMajor: ContractMajor }

export function negotiateContractMajor(value: unknown): ContractVersionSelection {
  return negotiateContractMajorForPolicy(value, PUBLIC_CONTRACT_VERSION_METADATA)
}

export function negotiateContractMajorForPolicy(
  value: unknown,
  policy: ContractVersionPolicy
): ContractVersionSelection {
  if (value === undefined || value === null) {
    return { kind: 'legacy-unversioned', selectedMajor: policy.currentMajor }
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
    selectedMajor < policy.supportedMajorRange.minimum ||
    selectedMajor > policy.supportedMajorRange.maximum
  ) {
    return { kind: 'unsupported', code: 'CONTRACT_VERSION_UNSUPPORTED', selectedMajor }
  }

  const deprecation = policy.deprecations.find(
    (item) => item.deprecatedInMajor === selectedMajor
  )
  return deprecation
    ? { kind: 'deprecated', selectedMajor, deprecation }
    : { kind: 'supported', selectedMajor }
}

export function restMajorFromPath(path: string): ContractVersionSelection {
  const versioned = path.match(/^\/api\/v([^/]+)(?:\/|$)/i)
  if (versioned) return negotiateContractMajor(versioned[1])

  const legacySelection = negotiateContractMajor(PUBLIC_CONTRACT_VERSION_METADATA.rest.legacyMajor)
  return legacySelection.kind === 'supported'
    ? {
        kind: 'legacy-unversioned',
        selectedMajor: PUBLIC_CONTRACT_VERSION_METADATA.rest.legacyMajor
      }
    : legacySelection
}

export function contractVersionDetails(
  selection: ContractVersionSelection,
  policy: ContractVersionPolicy = PUBLIC_CONTRACT_VERSION_METADATA
) {
  return {
    ...(selection.kind === 'legacy-unversioned' || selection.kind === 'invalid'
      ? selection.kind === 'legacy-unversioned' ? { legacyUnversioned: true } : {}
      : { selectedMajor: selection.selectedMajor }),
    currentMajor: policy.currentMajor,
    supportedMajorRange: policy.supportedMajorRange,
    ...(selection.kind === 'deprecated' ? { deprecation: selection.deprecation } : {})
  } as const
}

export function formatSupportedMajorRange(range: SupportedMajorRange): string {
  return `${range.minimum}-${range.maximum}`
}

export function contractVersionWarning(selection: ContractVersionSelection): string | undefined {
  if (selection.kind === 'legacy-unversioned') {
    return LEGACY_UNVERSIONED_CONTRACT_WARNING
  }
  if (selection.kind !== 'deprecated' || !selection.deprecation) return undefined

  const safeReason = selection.deprecation.reason.replace(/["\r\n]/g, "'").trim()
  return `299 - "contract major ${selection.selectedMajor} deprecated: ${safeReason}"`
}
