import type {
  RdkitAreSameStructureDTO,
  RdkitAreSameStructureWire,
  RdkitCanonicalSmilesWire,
  RdkitGetMoleculePropertiesDTO,
  RdkitGetMoleculePropertiesWire
} from './rdkit-contract'

export const NATS_CONTRACT_VERSION = '1.0.0' as const
export const NATS_TIMEOUT_POLICY_KEY = 'scientific-rpc' as const
export const NATS_TIMEOUT_MS = 3000 as const

export type NatsEnvironment = 'development' | 'test' | 'staging' | 'production' | (string & {})

export interface MercurionInferenceRequest {
  smiles: string
  accessToken: string
}

export interface Tox21Inference {
  probability: number
  is_positive: boolean
  threshold: number
}

export interface Tox21Prediction {
  'SR-ATAD5'?: Tox21Inference
  'NR-AhR'?: Tox21Inference
  'SR-MMP'?: Tox21Inference
  'SR-p53'?: Tox21Inference
}

export type MercurionInferenceResponse = Tox21Prediction | { error: string }

export interface NatsJsonSchema {
  readonly $schema: 'https://json-schema.org/draft/2020-12/schema'
  readonly type: 'object'
  readonly additionalProperties?: boolean
  readonly required?: readonly string[]
  readonly properties?: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly anyOf?: readonly Readonly<Record<string, unknown>>[]
}

export interface NatsErrorContract {
  readonly wireShape: 'error-string'
  readonly applicationCodes: readonly string[]
}

export interface NatsContract<Request, Response> {
  readonly id: string
  readonly version: typeof NATS_CONTRACT_VERSION
  readonly baseSubject: string
  readonly requestSchema: NatsJsonSchema
  readonly responseSchema: NatsJsonSchema
  readonly timeoutPolicyKey: typeof NATS_TIMEOUT_POLICY_KEY
  readonly timeoutMs: typeof NATS_TIMEOUT_MS
  readonly error: NatsErrorContract
  readonly request: (value: unknown) => value is Request
  readonly response: (value: unknown) => value is Response
}

const schema = (properties: NatsJsonSchema['properties'], required: readonly string[]): NatsJsonSchema => ({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required,
  properties
})

const stringProperty = (minLength = 1): Readonly<Record<string, unknown>> => ({
  type: 'string',
  minLength
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasError = (value: unknown): value is { error: string } =>
  isRecord(value) && typeof value.error === 'string' && value.error.trim().length > 0

const isInferenceResponse = (value: unknown): value is MercurionInferenceResponse => {
  if (hasError(value)) return true
  if (!isRecord(value)) return false
  return Object.entries(value).every(([label, prediction]) => {
    if (!['SR-ATAD5', 'NR-AhR', 'SR-MMP', 'SR-p53'].includes(label)) return false
    if (!isRecord(prediction)) return false
    return typeof prediction.probability === 'number' &&
      Number.isFinite(prediction.probability) &&
      typeof prediction.threshold === 'number' &&
      Number.isFinite(prediction.threshold) &&
      typeof prediction.is_positive === 'boolean'
  })
}

const isInferenceRequest = (value: unknown): value is MercurionInferenceRequest =>
  isRecord(value) &&
  typeof value.smiles === 'string' &&
  value.smiles.trim().length > 0 &&
  value.smiles.length <= 1024 &&
  typeof value.accessToken === 'string' &&
  value.accessToken.trim().length >= 10 &&
  value.accessToken.length <= 4096 &&
  Object.keys(value).every((key) => ['smiles', 'accessToken'].includes(key))

const isRdkitRequest = <T>(value: unknown): value is T =>
  isRecord(value) &&
  typeof value.accessToken === 'string' &&
  value.accessToken.trim().length >= 10 &&
  Object.keys(value).every((key) => ['accessToken', 'smiles', 'a', 'b', 'opts'].includes(key))

const isRdkitResponse = <T>(value: unknown): value is T => {
  if (hasError(value)) return true
  if (!isRecord(value) || !('data' in value)) return false
  const data = value.data
  return typeof data === 'string' || typeof data === 'boolean' || (
    isRecord(data) &&
    ['mwFreebase', 'alogp', 'hba', 'hbd', 'psa', 'rtb'].every((key) => key in data)
  )
}

const errorContract: NatsErrorContract = Object.freeze({
  wireShape: 'error-string',
  applicationCodes: Object.freeze([
    'TOX21_INVALID_PAYLOAD',
    'TOX21_INVALID_MOLECULE_PROPERTIES_PAYLOAD',
    'TOX21_INVALID_CANONICAL_SMILES_PAYLOAD',
    'TOX21_INVALID_ARE_SAME_STRUCTURE_PAYLOAD',
    'TOX21_UPSTREAM_ERROR',
    'TOX21_TIMEOUT',
    'TOX21_UNKNOWN_ERROR'
  ])
})

const inferenceRequestSchema = schema({
  smiles: stringProperty(),
  accessToken: stringProperty(10)
}, ['smiles', 'accessToken'])

const inferenceResponseSchema: NatsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  anyOf: [
    { required: ['error'], properties: { error: stringProperty() } },
    { properties: {
      'SR-ATAD5': { type: 'object' },
      'NR-AhR': { type: 'object' },
      'SR-MMP': { type: 'object' },
      'SR-p53': { type: 'object' }
    } }
  ]
}

const rdkitRequestSchema = schema({
  accessToken: stringProperty(10),
  smiles: stringProperty(),
  a: stringProperty(),
  b: stringProperty(),
  opts: { type: 'object' }
}, ['accessToken'])

const rdkitResponseSchema: NatsJsonSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  anyOf: [
    { required: ['error'], properties: { error: stringProperty() } },
    { required: ['data'] }
  ]
}

const contract = <Request, Response>(
  id: string,
  baseSubject: string,
  requestSchema: NatsJsonSchema,
  responseSchema: NatsJsonSchema,
  request: (value: unknown) => value is Request,
  response: (value: unknown) => value is Response
): NatsContract<Request, Response> => Object.freeze({
  id,
  version: NATS_CONTRACT_VERSION,
  baseSubject,
  requestSchema,
  responseSchema,
  timeoutPolicyKey: NATS_TIMEOUT_POLICY_KEY,
  timeoutMs: NATS_TIMEOUT_MS,
  error: errorContract,
  request,
  response
})

export const NATS_CONTRACT_REGISTRY = Object.freeze({
  inferenceTop4: contract<MercurionInferenceRequest, MercurionInferenceResponse>(
    'mercurion.inference.top4',
    'inference.tox21.smiles',
    inferenceRequestSchema,
    inferenceResponseSchema,
    isInferenceRequest,
    isInferenceResponse
  ),
  rdkitGetMoleculeProperties: contract<RdkitGetMoleculePropertiesDTO, RdkitGetMoleculePropertiesWire>(
    'mercurion.rdkit.get-molecule-properties',
    'rdkit_api.get_molecule_properties',
    rdkitRequestSchema,
    rdkitResponseSchema,
    isRdkitRequest,
    isRdkitResponse
  ),
  rdkitToCanonicalSmiles: contract(
    'mercurion.rdkit.to-canonical-smiles',
    'rdkit_api.to_canonical_smiles',
    rdkitRequestSchema,
    rdkitResponseSchema,
    isRdkitRequest,
    isRdkitResponse
  ),
  rdkitAreSameStructure: contract<RdkitAreSameStructureDTO, RdkitAreSameStructureWire>(
    'mercurion.rdkit.are-same-structure',
    'rdkit_api.are_same_structure',
    rdkitRequestSchema,
    rdkitResponseSchema,
    isRdkitRequest,
    isRdkitResponse
  )
} as const)

export type NatsContractId = keyof typeof NATS_CONTRACT_REGISTRY

export function natsSubject(contractId: NatsContractId, environment: NatsEnvironment): string {
  const baseSubject = NATS_CONTRACT_REGISTRY[contractId].baseSubject
  return environment === 'production' ? baseSubject : `${environment}.${baseSubject}`
}

export function assertNatsRequest<T>(entry: NatsContract<T, unknown>, value: unknown): asserts value is T {
  if (!entry.request(value)) {
    throw new TypeError(`Invalid NATS request for ${entry.id} v${entry.version}`)
  }
}

export function assertNatsResponse<T>(entry: NatsContract<unknown, T>, value: unknown): asserts value is T {
  if (!entry.response(value)) {
    throw new TypeError(`Invalid NATS response for ${entry.id} v${entry.version}`)
  }
}
