import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { GraphQLModule, GraphQLSchemaHost } from '@nestjs/graphql'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import { CONTRACT_VERSION_HEADER, PUBLIC_CONTRACT_VERSION_METADATA } from '@mercurion/rest-contracts'
import {
  getNamedType, isEnumType, isInputObjectType, isListType, isNonNullType, isObjectType,
  type GraphQLInputType, type GraphQLSchema
} from 'graphql'
import { Environment } from 'src/config/config.schema'
import { createMercurionGraphQLConfig } from 'src/mercurion-graphql.module'
import { NotebookDomainService } from 'src/app_modules/lab-notebook/scientific-domain/notebook-domain.service'
import { ExperimentProtocolService } from 'src/app_modules/lab-notebook/scientific-domain/experiment-protocol.service'
import {
  LabNotebookDomainResolver, NotebookSectionDomainResolver, NotebookExperimentDomainResolver,
  ExperimentExecutionDomainResolver, ExperimentProtocolRevisionDomainResolver
} from 'src/app_modules/lab-notebook/scientific-domain/notebook-domain.resolver'
import { SyntheticRouteResolver } from 'src/app_modules/synth/resolvers/synthetic-route.resolver'
import { SyntheticStepResolver } from 'src/app_modules/synth/resolvers/synthetic-step.resolver'
import { SynthStepItemResolver } from 'src/app_modules/synth/resolvers/synth-step-item.resolver'
import { SynthesisPoolResolver } from 'src/app_modules/synth/resolvers/synthesis-pool.resolver'
import { SynthesisService } from 'src/app_modules/synth/services/synthesis.service'
import { SyntheticStepService } from 'src/app_modules/synth/services/synthetic-step.service'
import { SynthStepItemService } from 'src/app_modules/synth/services/synth-step-item.service'
import { SynthesisPoolService } from 'src/app_modules/synth/services/synthesis-pool.service'
import { FeatureAccessGuard } from './feature-access.guard'

const id = '019a68d0-72fa-71a3-a1e8-a34fc1c23712'

// Values must pass GraphQL coercion so a validation error cannot mask a missing guard.
function inputValue(type: GraphQLInputType): unknown {
  if (isNonNullType(type)) return inputValue(type.ofType)
  if (isListType(type)) return [inputValue(type.ofType)]
  if (isInputObjectType(type)) {
    return Object.fromEntries(Object.values(type.getFields())
      .filter(field => isNonNullType(field.type))
      .map(field => [field.name, inputValue(field.type)]))
  }
  if (isEnumType(type)) return type.getValues()[0].value
  if (type.name === 'ID') return id
  if (type.name === 'String') return 'Research'
  if (type.name === 'Int' || type.name === 'Float') return 1
  if (type.name === 'Boolean') return true
  throw new Error(`Missing feature boundary fixture for ${type.name}`)
}

describe('Disabled scientific GraphQL execution boundary', () => {
  let app: NestFastifyApplication
  let schema: GraphQLSchema
  const getOrThrow = jest.fn().mockReturnValue(Environment.Production)
  const services = [
    NotebookDomainService, ExperimentProtocolService, SynthesisService,
    SyntheticStepService, SynthStepItemService, SynthesisPoolService
  ].map(service => ({
    provide: service,
    useValue: Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(service.prototype))
      .filter(([name, descriptor]) => name !== 'constructor' && typeof descriptor.value === 'function')
      .map(([name]) => [name, jest.fn()])) as Record<string, jest.Mock>
  }))

  beforeAll(async () => {
    const config = { getOrThrow } as unknown as ConfigService
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot({
        ...createMercurionGraphQLConfig(config),
        // This fixture contains only scientific resolvers, none using the app's JSON scalar.
        resolvers: {},
        cache: false
      })],
      providers: [
        LabNotebookDomainResolver, NotebookSectionDomainResolver, NotebookExperimentDomainResolver,
        ExperimentExecutionDomainResolver, ExperimentProtocolRevisionDomainResolver,
        SyntheticRouteResolver, SyntheticStepResolver, SynthStepItemResolver, SynthesisPoolResolver,
        ...services,
        { provide: ConfigService, useValue: config },
        { provide: APP_GUARD, useClass: FeatureAccessGuard }
      ]
    }).compile()
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false })
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
    schema = app.get(GraphQLSchemaHost).schema
  })

  afterAll(async () => { await app?.close() })
  beforeEach(() => jest.clearAllMocks())

  it.each(Object.values(Environment))(
    'rejects all 46 GraphQL roots in %s with the canonical 403 envelope and no service calls',
    async environment => {
      getOrThrow.mockReturnValue(environment)
      let checked = 0
      for (const [kind, root] of [
        ['query', schema.getQueryType()], ['mutation', schema.getMutationType()]
      ] as const) {
        for (const field of Object.values(root!.getFields())) {
          const args = field.args.filter(arg => isNonNullType(arg.type))
          const declarations = args.map(arg => `$${arg.name}: ${arg.type.toString()}`)
          const values = args.map(arg => `${arg.name}: $${arg.name}`)
          const variables = Object.fromEntries(args.map(arg => [arg.name, inputValue(arg.type)]))
          const selection = isObjectType(getNamedType(field.type)) ? '{ __typename }' : ''
          const query = `${kind}${args.length ? `(${declarations.join(', ')})` : ''} {
            ${field.name}${args.length ? `(${values.join(', ')})` : ''} ${selection}
          }`
          const response = await app.inject({
            method: 'POST', url: PUBLIC_CONTRACT_VERSION_METADATA.graphql.endpoint,
            headers: { [CONTRACT_VERSION_HEADER]: '1', 'x-user-id': id },
            payload: { query, variables }
          })
          const body = response.json<{ data: unknown; errors: unknown[] }>()
          expect({ field: field.name, status: response.statusCode }).toEqual({
            field: field.name, status: 403
          })
          expect(body.data).toEqual(isNonNullType(field.type) ? null : { [field.name]: null })
          expect(body.errors).toEqual([expect.objectContaining({
            path: [field.name],
            extensions: expect.objectContaining({
              code: 'FORBIDDEN', status: 403,
              applicationError: expect.objectContaining({ code: 'FORBIDDEN', status: 403 })
            })
          })])
          checked++
        }
      }
      expect(checked).toBe(46)
      for (const service of services) {
        for (const method of Object.values(service.useValue)) expect(method).not.toHaveBeenCalled()
      }
    }
  )
})
