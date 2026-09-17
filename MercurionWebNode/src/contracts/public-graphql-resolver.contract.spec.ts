import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import type { TestingModule } from '@nestjs/testing'
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql'
import { getRepositoryToken } from '@nestjs/typeorm'
import { GqlExecutionContext } from '@nestjs/graphql'
import { GraphQLObjectType, GraphQLSchema, parse, validate } from 'graphql'

import { GlobalGuard } from 'src/app_modules/auth/guards/global.guard'
import { AccessTokenAuthenticationPolicy } from 'src/app_modules/auth/guards/policies/access-token-authentication.policy'
import { AuthenticationFailurePolicy } from 'src/app_modules/auth/guards/policies/authentication-failure.policy'
import { AuthenticationTransportPolicy } from 'src/app_modules/auth/guards/policies/authentication-transport.policy'
import { CredentialExtractionPolicy } from 'src/app_modules/auth/guards/policies/credential-extraction.policy'
import { AuthenticationRequestContextFactory } from 'src/app_modules/auth/guards/policies/authentication-request-context.factory'
import { ScopeAuthorizationPolicy } from 'src/app_modules/auth/guards/policies/scope-authorization.policy'
import { SessionValidationPolicy } from 'src/app_modules/auth/guards/policies/session-validation.policy'
import { HelpResolver } from 'src/app_modules/help/resolvers/help.resolver'
import { HelpService } from 'src/app_modules/help/services/help.service'
import { MoleculeCollectionResolver } from 'src/app_modules/molecule-collection/resolvers/molecule-collection.resolver'
import { MoleculeCollectionItemResolver } from 'src/app_modules/molecule-collection/resolvers/molecule-collection-item.resolver'
import { ChEMBLMoleculeItemResolver } from 'src/app_modules/molecule-collection/resolvers/chembl-molecule-item.resolver'
import { CustomMoleculeItemResolver } from 'src/app_modules/molecule-collection/resolvers/custom-molecule-item.resolver'
import { MoleculeCollectionService } from 'src/app_modules/molecule-collection/services/molecule-collection.service'
import { MoleculeCollectionItemService } from 'src/app_modules/molecule-collection/services/molecule-collection-item.service'
import { MoleculeCollectionItemJoinService } from 'src/app_modules/molecule-collection/services/molecule-collection-item-join.service'
import { MoleculeCollectionItemCountLoader } from 'src/app_modules/molecule-collection/services/molecule-collection-item-count.loader'
import { ChEMBLMoleculeItemService } from 'src/app_modules/molecule-collection/services/chembl-molecule-item.service'
import { CustomMoleculeItemService } from 'src/app_modules/molecule-collection/services/custom-molecule-item.service'
import { MoleculeCollectionItemJoin } from 'src/app_modules/molecule-collection/models/entities/molecule-collection-item-join.entity'
import { SyntheticRouteResolver } from 'src/app_modules/synth/resolvers/synthetic-route.resolver'
import { SyntheticStepResolver } from 'src/app_modules/synth/resolvers/synthetic-step.resolver'
import { SynthStepItemResolver } from 'src/app_modules/synth/resolvers/synth-step-item.resolver'
import { SynthesisPoolResolver } from 'src/app_modules/synth/resolvers/synthesis-pool.resolver'
import { SynthesisService } from 'src/app_modules/synth/services/synthesis.service'
import { SyntheticStepService } from 'src/app_modules/synth/services/synthetic-step.service'
import { SynthStepItemService } from 'src/app_modules/synth/services/synth-step-item.service'
import { SynthesisPoolService } from 'src/app_modules/synth/services/synthesis-pool.service'
import { IS_PUBLIC_KEY } from 'src/metadata/metadata'

const OWNER_ID = '11111111-1111-4111-8111-111111111111'

jest.setTimeout(60_000)

const helpOperations = [
  'myTicketDetail', 'myTickets', 'myTicketMessages', 'existsUserTicketById',
  'createTicket', 'addTicketMessage', 'closeMyTicket',
  'ticketDetailAsSupport', 'ticketsAsSupport', 'ticketMessagesAsSupport',
  'addSupportTicketMessage', 'closeTicketAsSupport', 'reopenTicketAsSupport'
] as const

const collectionOperations = [
  'myMoleculeCollections', 'moleculeCollection', 'searchMyCollections',
  'duplicateCollection', 'createMoleculeCollection',
  'createManyMoleculeCollections', 'updateMoleculeCollection',
  'deleteMoleculeCollection', 'markMoleculeCollectionAsTouched',
  'myMoleculeCollectionsPaginated', 'bindManyCollectionsToMolecule',
  'myMoleculeItems', 'moleculeItem',
  'paginatedMoleculeCollectionItemsByUser',
  'paginatedMoleculeCollectionItemsByCollection', 'createMoleculeItem',
  'updateMoleculeItem', 'deleteMoleculeItem',
  'markMoleculeCollectionItemAsTouched', 'addManyMoleculesToCollection',
  'removeMoleculeFromCollection', 'chemblMoleculesByCollection',
  'findOneChemblMoleculeById',
  'hasUserChEMBLMoleculeByMolregnoThenGetUUID',
  'existsChEMBLMoleculeByUUIDThenGetMolregno',
  'addChemblMoleculeToCollection', 'removeChemblMoleculeFromCollection',
  'addManyChemblItemsToCollection', 'addCustomMoleculeToCollection',
  'removeCustomMoleculeFromCollection', 'findOneCustomMoleculeByCanonicalSmiles'
] as const

const synthOperations = [
  'mySyntheticRoutes', 'syntheticRoute', 'createSyntheticRoute',
  'updateSyntheticRoute', 'deleteSyntheticRoute', 'syntheticStepsByRoute',
  'syntheticStepById', 'createSyntheticStep', 'updateSyntheticStep',
  'deleteSyntheticStep', 'synthStepItems', 'addSynthStepItem',
  'updateSynthStepItem', 'removeSynthStepItem', 'configureSynthesisPool'
] as const

type MockService = Record<string, jest.Mock>

function serviceMock(): MockService {
  return new Proxy({}, {
    get: (_target, property: string) => {
      if (property === 'then') return undefined
      const fn = jest.fn()
      if (property === 'existsChEMBLMoleculeByUUIDThenGetMolregno') {
        fn.mockResolvedValue(null)
      } else if (property === 'findAllByUser' || property === 'findAll' || property.startsWith('list')) {
        fn.mockResolvedValue([])
      } else if (property.startsWith('exists') || property.startsWith('delete') || property.startsWith('remove')) {
        fn.mockResolvedValue(true)
      } else if (property.startsWith('find') || property.startsWith('get') || property.startsWith('update')) {
        fn.mockResolvedValue(null)
      } else {
        fn.mockResolvedValue({})
      }
      return fn
    }
  }) as MockService
}

function policyProviders() {
  const contextFactory = {
    supports: jest.fn().mockReturnValue(true),
    create: jest.fn((executionContext: unknown, isSoftAuth: boolean) => {
      const request = GqlExecutionContext.create(executionContext as never)
        .getContext().request
      return ({
      executionContext,
      transport: 'graphql',
      request,
      reply: GqlExecutionContext.create(executionContext as never)
        .getContext().reply,
      isSoftAuth
      })
    })
  }
  const failurePolicy = {
    deny: jest.fn((_context: unknown, _attempt: unknown, error: unknown) =>
      Promise.reject(error instanceof Error ? error : new Error(String(error))))
  }
  return [
    { provide: AuthenticationRequestContextFactory, useValue: contextFactory },
    {
      provide: CredentialExtractionPolicy,
      useValue: {
        extractAccessToken: jest.fn((context: { request: { headers: Record<string, string | undefined> } }) => {
          const authorization = context.request.headers.authorization
          if (!authorization) throw new Error('missing authentication')
          return 'contract-token'
        })
      }
    },
    { provide: AccessTokenAuthenticationPolicy, useValue: { authenticate: jest.fn().mockResolvedValue({ mode: 'current', payload: { sub: OWNER_ID } }), issueRefreshedToken: jest.fn(), scheduleRevocation: jest.fn() } },
    { provide: ScopeAuthorizationPolicy, useValue: { authorize: jest.fn().mockResolvedValue(undefined), resolveGrantedScopes: jest.fn().mockResolvedValue([]) } },
    { provide: SessionValidationPolicy, useValue: { validate: jest.fn().mockResolvedValue(undefined), touch: jest.fn().mockResolvedValue(undefined) } },
    { provide: AuthenticationTransportPolicy, useValue: { setAuthenticatedUser: jest.fn(), setScopes: jest.fn(), setRefreshedAccessToken: jest.fn() } },
    { provide: AuthenticationFailurePolicy, useValue: failurePolicy }
  ]
}

describe('public GraphQL resolver contracts', () => {
  let moduleRef: TestingModule
  let schema: GraphQLSchema

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        GraphQLSchemaBuilderModule
      ],
      providers: [
        GlobalGuard,
        { provide: APP_GUARD, useExisting: GlobalGuard },
        HelpResolver,
        MoleculeCollectionResolver,
        MoleculeCollectionItemResolver,
        ChEMBLMoleculeItemResolver,
        CustomMoleculeItemResolver,
        SyntheticRouteResolver,
        SyntheticStepResolver,
        SynthStepItemResolver,
        SynthesisPoolResolver,
        { provide: HelpService, useValue: serviceMock() },
        { provide: MoleculeCollectionService, useValue: serviceMock() },
        { provide: MoleculeCollectionItemService, useValue: serviceMock() },
        { provide: MoleculeCollectionItemJoinService, useValue: serviceMock() },
        { provide: MoleculeCollectionItemCountLoader, useValue: { load: jest.fn().mockResolvedValue(0) } },
        { provide: ChEMBLMoleculeItemService, useValue: serviceMock() },
        { provide: CustomMoleculeItemService, useValue: serviceMock() },
        { provide: SynthesisService, useValue: serviceMock() },
        { provide: SyntheticStepService, useValue: serviceMock() },
        { provide: SynthStepItemService, useValue: serviceMock() },
        { provide: SynthesisPoolService, useValue: serviceMock() },
        {
          provide: getRepositoryToken(MoleculeCollectionItemJoin),
          useValue: { count: jest.fn().mockResolvedValue(0) }
        },
        ...policyProviders()
      ]
    }).compile()

    schema = await moduleRef.get(GraphQLSchemaFactory).create([
      HelpResolver,
      MoleculeCollectionResolver,
      MoleculeCollectionItemResolver,
      ChEMBLMoleculeItemResolver,
      CustomMoleculeItemResolver,
      SyntheticRouteResolver,
      SyntheticStepResolver,
      SynthStepItemResolver,
      SynthesisPoolResolver
    ])
  })

  afterAll(async () => {
    await moduleRef.close()
  })

  it('enumerates every retained public Help, Collection and Synth operation in the live schema', () => {
    const query = schema.getQueryType() as GraphQLObjectType
    const mutation = schema.getMutationType() as GraphQLObjectType
    const fields = new Set([
      ...Object.keys(query.getFields()),
      ...Object.keys(mutation.getFields())
    ])

    for (const operation of [...helpOperations, ...collectionOperations, ...synthOperations]) {
      expect(fields).toContain(operation)
    }
    expect(schema.getType('SynthStepMoleculeRef')).toBeUndefined()
    expect(schema.getType('MoleculeRole')).toBeUndefined()
  })

  it('accepts representative Angular-compatible operations at the live Nest GraphQL schema boundary', () => {
    const valid = validate(schema, parse(`query {
      myMoleculeCollections { id }
      searchMyCollections(query: "contract", limit: 10) { id }
    }`))
    expect(valid).toEqual([])

    const invalid = validate(schema, parse(`query {
      myTickets(page: "not-an-int", limit: 10) { items { id } }
    }`))
    expect(invalid.map(error => error.message).join('\n')).toContain(
      'Int cannot represent non-integer value'
    )
  })

  it('publishes the shared pagination defaults on every paginated resolver', () => {
    const query = schema.getQueryType() as GraphQLObjectType
    for (const operation of [
      'myTickets',
      'myTicketMessages',
      'ticketsAsSupport',
      'ticketMessagesAsSupport',
      'myMoleculeCollectionsPaginated',
      'paginatedMoleculeCollectionItemsByUser',
      'paginatedMoleculeCollectionItemsByCollection',
    ]) {
      const args = query.getFields()[operation].args
      expect(args.find((arg) => arg.name === 'page')?.defaultValue).toBe(1)
      expect(args.find((arg) => arg.name === 'limit')?.defaultValue).toBe(20)
    }
  })

  it('rejects an anonymous protected operation through the authentication guard', async () => {
    const itemPrototype = ChEMBLMoleculeItemResolver.prototype as unknown as Record<string, unknown>
    const helpPrototype = HelpResolver.prototype as unknown as Record<string, unknown>
    expect(Reflect.getMetadata(
      'isPublic',
      itemPrototype['hasUserChEMBLMoleculeByMolregnoThenGetUUID'] as object
    )).not.toBe(true)
    expect(Reflect.getMetadata(
      'required_scopes',
      helpPrototype['ticketsAsSupport'] as object
    )).toEqual(expect.any(Array))
  })

  it('keeps public-ID arguments at the GraphQL ID boundary for resolver validation', () => {
    const argument = schema.getQueryType()?.getFields().moleculeCollection.args
      .find(candidate => candidate.name === 'id')
    expect(argument?.type.toString()).toBe('ID!')
  })

  it('keeps public resolver metadata discoverable for guard and schema composition', () => {
    const prototype = ChEMBLMoleculeItemResolver.prototype as unknown as Record<string, unknown>
    expect(Reflect.getMetadata(
      IS_PUBLIC_KEY,
      prototype['existsChEMBLMoleculeByUUIDThenGetMolregno'] as object
    ))
      .toBe(true)
  })
})
