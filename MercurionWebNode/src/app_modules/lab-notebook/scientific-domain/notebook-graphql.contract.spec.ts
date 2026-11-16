import { Test } from '@nestjs/testing'
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import {
  getNamedType, isInputObjectType, isListType, isNonNullType,
  GraphQLInputType, GraphQLSchema, Kind, parse, print, separateOperations, typeFromAST
} from 'graphql'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createGlobalValidationPipe } from 'src/config/validation-pipe'
import { NotebookDomainService } from './notebook-domain.service'
import { ExperimentProtocolService } from './experiment-protocol.service'
import {
  ExperimentExecutionDomainResolver, ExperimentProtocolRevisionDomainResolver,
  LabNotebookDomainResolver, NotebookExperimentDomainResolver, NotebookSectionDomainResolver
} from './notebook-domain.resolver'

const id = '019a68d0-72fa-71a3-a1e8-a34fc1c23712'
const owner = '019a68d0-72fb-72a3-98df-c9cdf14e17a4'
const delta = { ops: [{ insert: 'Scientific notes\n' }] }
const row = {
  id, userId: owner, notebookId: id, sectionId: id, experimentId: id,
  title: 'Research', status: 'DRAFT', sectionOrder: 0, experimentOrder: 0, executionOrder: 0,
  archivedAt: null, protocolRevisionId: null, startedAt: null, completedAt: null,
  premiseDelta: delta, contentDelta: delta, premiseText: 'Scientific notes\n',
  sanitizedText: 'Scientific notes\n', createdAt: 1, updatedAt: 1,
  revisionNumber: 1, snapshotSchemaVersion: 1, snapshot: {}, checksumSha256: 'a'.repeat(64)
}
const domainMethods = [
  'listNotebooks', 'findNotebook', 'createNotebook', 'patchNotebook', 'archiveNotebook',
  'listSections', 'findSection', 'createSection', 'patchSection', 'reorderSections',
  'listExperiments', 'findExperiment', 'createExperiment', 'patchExperiment',
  'archiveExperiment', 'reorderExperiments', 'listExecutions', 'findExecution',
  'createExecution', 'patchExecution', 'archiveExecution', 'reorderExecutions',
  'listRevisions', 'findRevision'
]
const protocolMethods = [
  'start', 'complete', 'cancel', 'linkSynthesisToExperiment', 'unlinkSynthesisFromExperiment',
  'linkSynthesisToExecution', 'linkMoleculeToExecution'
]
function serviceMock(methods: string[]): Record<string, jest.Mock> {
  return Object.fromEntries(methods.map(method => [method, jest.fn().mockResolvedValue(
    method.startsWith('list') ? [row] :
      method.startsWith('reorder') || method.includes('link') ? true : row
  )]))
}

const catalog = separateOperations(parse(readFileSync(resolve(
  __dirname, '../../../../..',
  'MercurionWebNg/src/app/graphql/documents/notebook.graphql'
), 'utf8')))

/** Include optional fields too: whitelist validation must accept the complete DTO. */
function inputValue(type: GraphQLInputType): unknown {
  if (isNonNullType(type)) return inputValue(type.ofType)
  if (isListType(type)) return [inputValue(type.ofType)]
  const named = getNamedType(type)
  if (isInputObjectType(named)) {
    return Object.fromEntries(Object.values(named.getFields()).map(field => [
      field.name, inputValue(field.type)
    ]))
  }
  if (named.name === 'ID') return id
  if (named.name === 'JSONObject') return delta
  if (named.name === 'String') return 'Research'
  throw new Error(`Missing notebook fixture for ${named.name}`)
}

describe('Notebook GraphQL operations with the global validation pipe', () => {
  let app: NestFastifyApplication
  let schema: GraphQLSchema
  const notebooks = serviceMock(domainMethods)
  const protocols = serviceMock(protocolMethods)

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot<MercuriusDriverConfig>({
        driver: MercuriusDriver, autoSchemaFile: true,
        // Exercise validation on every request; no query cache is needed in this fixture.
        cache: false,
        context: request => ({ request })
      })],
      providers: [
        LabNotebookDomainResolver, NotebookSectionDomainResolver,
        NotebookExperimentDomainResolver, ExperimentExecutionDomainResolver,
        ExperimentProtocolRevisionDomainResolver,
        { provide: NotebookDomainService, useValue: notebooks },
        { provide: ExperimentProtocolService, useValue: protocols }
      ]
    }).compile()
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false })
    app.useGlobalPipes(createGlobalValidationPipe())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    schema = app.get(GraphQLSchemaHost).schema
  })

  afterAll(async () => { await app?.close() })
  beforeEach(() => { jest.clearAllMocks() })

  async function execute(query: string, variables: Record<string, unknown> = {}) {
    const response = await app.inject({
      method: 'POST', url: '/graphql', headers: { 'x-user-id': owner },
      payload: { query, variables }
    })
    return response.json<{ data?: Record<string, unknown>; errors?: unknown[] }>()
  }

  it.each(Object.entries(catalog))('accepts the frontend operation %s', async (_name, document) => {
    const operation = document.definitions.find(definition => definition.kind === Kind.OPERATION_DEFINITION)
    if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) throw new Error('Missing operation')
    const variables = Object.fromEntries((operation.variableDefinitions ?? []).map(variable => {
      const type = typeFromAST(schema, variable.type) as GraphQLInputType
      return [variable.variable.name.value, inputValue(type)]
    }))
    const result = await execute(print(document), variables)
    expect(result.errors).toBeUndefined()
    expect(result.data).toBeDefined()
    const calls = [...Object.values(notebooks), ...Object.values(protocols)]
      .flatMap(mock => mock.mock.calls)
    expect(calls.length).toBeGreaterThan(0)
    expect(calls.every(call => call[0] === owner)).toBe(true)
  })

  it.each([
    ['notebookSections', 'notebookId'], ['notebookExperiments', 'sectionId'],
    ['experimentExecutions', 'experimentId'], ['experimentProtocolRevisions', 'experimentId']
  ])('accepts the additional list query %s', async (field, argument) => {
    const result = await execute(`query($id: ID!) { ${field}(${argument}: $id) { id } }`, { id })
    expect(result.errors).toBeUndefined()
    expect(result.data?.[field]).toEqual([{ id }])
  })

  it('covers every notebook query and mutation exposed by the resolvers', () => {
    const catalogFields = Object.values(catalog).flatMap(document =>
      document.definitions.flatMap(definition => definition.kind === Kind.OPERATION_DEFINITION
        ? definition.selectionSet.selections.flatMap(selection =>
          selection.kind === Kind.FIELD ? [selection.name.value] : []) : []))
    const actual = [schema.getQueryType(), schema.getMutationType()]
      .flatMap(type => Object.keys(type?.getFields() ?? {}))
    expect(actual.sort()).toEqual([...catalogFields,
      'notebookSections', 'notebookExperiments', 'experimentExecutions',
      'experimentProtocolRevisions'
    ].sort())
  })

  it.each([
    ['ScientificNotebookPatchInput', 'updateLabNotebook', 'premiseDelta'],
    ['NotebookSectionPatchInput', 'updateNotebookSection', 'contentDelta'],
    ['NotebookExperimentPatchInput', 'updateNotebookExperiment', 'contentDelta'],
    ['ExperimentExecutionPatchInput', 'updateExperimentExecution', 'contentDelta']
  ])('accepts omitted fields and explicit JSON null in %s', async (type, field, deltaField) => {
    const query = `mutation($input: ${type}!) { ${field}(input: $input) { id } }`
    for (const input of [{ id }, { id, [deltaField]: null }]) {
      expect((await execute(query, { input })).errors).toBeUndefined()
    }
  })

  it('accepts an omitted or null optional synthesis step', async () => {
    const query = `mutation($input: ExecutionSynthesisLinkInput!) {
      linkSynthesisToExecution(input: $input)
    }`
    for (const input of [
      { executionId: id, synthesisId: id },
      { executionId: id, synthesisId: id, stepId: null }
    ]) {
      expect((await execute(query, { input })).errors).toBeUndefined()
    }
  })

  it.each([
    ['ScientificNotebookPatchInput', 'updateLabNotebook'],
    ['NotebookSectionCreateInput', 'createNotebookSection'],
    ['NotebookSectionPatchInput', 'updateNotebookSection'],
    ['NotebookExperimentCreateInput', 'createNotebookExperiment'],
    ['NotebookExperimentPatchInput', 'updateNotebookExperiment'],
    ['ExperimentExecutionCreateInput', 'createExperimentExecution'],
    ['ExperimentExecutionPatchInput', 'updateExperimentExecution'],
    ['NotebookOrderInput', 'reorderNotebookSections'],
    ['ExperimentSynthesisLinkInput', 'linkSynthesisToExperiment'],
    ['ExecutionSynthesisLinkInput', 'linkSynthesisToExecution'],
    ['ExecutionMoleculeLinkInput', 'linkMoleculeToExecution']
  ])('rejects invalid IDs and unknown properties in %s', async (typeName, field) => {
    const type = schema.getType(typeName)
    if (!type || !isInputObjectType(type)) throw new Error('Missing input type')
    const valid = inputValue(type) as Record<string, unknown>
    const selection = field.startsWith('reorder') || field.startsWith('link') ? '' : '{ id }'
    const query = `mutation($input: ${typeName}!) { ${field}(input: $input) ${selection} }`
    const invalidInputs = [
      { ...valid, unexpected: true },
      ...Object.values(type.getFields()).filter(input =>
        getNamedType(input.type).name === 'ID'
      ).map(input => ({
        ...valid, [input.name]: input.name === 'orderedIds' ? ['invalid'] : 'invalid'
      }))
    ]
    for (const input of invalidInputs) {
      const result = await execute(query, { input })
      expect(result.errors?.length).toBeGreaterThan(0)
    }
    for (const mock of [...Object.values(notebooks), ...Object.values(protocols)]) {
      expect(mock).not.toHaveBeenCalled()
    }
  })
})
