import { ExecutionContext, ForbiddenException, type Type } from '@nestjs/common'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { buildSchema, getNamedType, isObjectType } from 'graphql'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Environment } from 'src/config/config.schema'
import { LabNotebookModule } from 'src/app_modules/lab-notebook/lab-notebook.module'
import {
  LabNotebookDomainResolver,
  NotebookSectionDomainResolver,
  NotebookExperimentDomainResolver,
  ExperimentExecutionDomainResolver,
  ExperimentProtocolRevisionDomainResolver
} from 'src/app_modules/lab-notebook/scientific-domain/notebook-domain.resolver'
import { SynthModule } from 'src/app_modules/synth/synth.module'
import { SyntheticRouteResolver } from 'src/app_modules/synth/resolvers/synthetic-route.resolver'
import { SyntheticStepResolver } from 'src/app_modules/synth/resolvers/synthetic-step.resolver'
import { SynthStepItemResolver } from 'src/app_modules/synth/resolvers/synth-step-item.resolver'
import { SynthesisPoolResolver } from 'src/app_modules/synth/resolvers/synthesis-pool.resolver'
import { DropboxObjectStoreModule } from 'src/app_modules/dropbox-object-store/dropbox-object-store.module'
import { DocumentController } from 'src/app_modules/dropbox-object-store/controllers/document.controller'
import { presentApplicationError, graphQLStatusForPresentation } from 'src/exception-handling/application-error-envelope'
import { FeatureAccessGuard } from './feature-access.guard'
import { REQUIRED_FEATURES_METADATA } from './feature-access.decorator'
import { FEATURE_FLAGS, type FeatureName } from './feature-flags'
import * as featureFlags from './feature-flags'

const notebookResolvers = [
  LabNotebookDomainResolver,
  NotebookSectionDomainResolver,
  NotebookExperimentDomainResolver,
  ExperimentExecutionDomainResolver,
  ExperimentProtocolRevisionDomainResolver
]
const synthesisResolvers = [
  SyntheticRouteResolver,
  SyntheticStepResolver,
  SynthesisPoolResolver,
  SynthStepItemResolver
]
const groups: ReadonlyArray<{ feature: FeatureName; classes: Array<Type<unknown>> }> = [
  { feature: 'notebook', classes: notebookResolvers },
  { feature: 'synthesis', classes: synthesisResolvers },
  { feature: 'documents', classes: [DocumentController] }
]
const synthesisLinks = [
  [NotebookExperimentDomainResolver, 'linkSynthesisToExperiment'],
  [NotebookExperimentDomainResolver, 'unlinkSynthesisFromExperiment'],
  [ExperimentExecutionDomainResolver, 'linkSynthesisToExecution']
] as const

function ownMethods(target: Type<unknown>): string[] {
  return Object.getOwnPropertyNames(target.prototype).filter(name =>
    name !== 'constructor' && typeof target.prototype[name] === 'function'
  )
}

function contextFor(target: Type<unknown>, method: string): ExecutionContext {
  return {
    getClass: () => target,
    getHandler: () => Object.getOwnPropertyDescriptor(target.prototype, method)?.value
  } as unknown as ExecutionContext
}

function guardFor(environment: Environment): FeatureAccessGuard {
  return new FeatureAccessGuard(
    new Reflector(),
    { getOrThrow: jest.fn().mockReturnValue(environment) } as unknown as ConfigService
  )
}

describe('Mercurion beta feature boundary coverage', () => {
  afterEach(() => jest.restoreAllMocks())

  it('keeps all three features disabled in all four validated backend environments', () => {
    expect(Object.values(Environment)).toHaveLength(4)
    for (const environment of Object.values(Environment)) {
      for (const feature of ['notebook', 'synthesis', 'documents'] as const) {
        expect(FEATURE_FLAGS[environment][feature]).toBe(false)
      }
    }
  })

  it('has exactly five Notebook and four Synthesis resolver classes registered', () => {
    const providerNames = (module: Type<unknown>) =>
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) as Type<unknown>[])
        .filter(provider => provider.name.endsWith('Resolver'))
        .map(provider => provider.name)
        .sort()
    expect(providerNames(LabNotebookModule)).toEqual(notebookResolvers.map(x => x.name).sort())
    expect(providerNames(SynthModule)).toEqual(synthesisResolvers.map(x => x.name).sort())
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS, DropboxObjectStoreModule
    ) as Type<unknown>[]
    expect(controllers).toEqual([DocumentController])
  })

  it('guards every handler in each registered deferred class for every environment', () => {
    for (const { feature, classes } of groups) {
      for (const target of classes) {
        const declared = Reflect.getMetadata(REQUIRED_FEATURES_METADATA, target) as string[] | undefined
        expect(declared).toContain(feature)
        const methods = ownMethods(target)
        expect(methods.length).toBeGreaterThan(0)
        for (const environment of Object.values(Environment)) {
          const guard = guardFor(environment)
          for (const method of methods) {
            const handler = contextFor(target, method)
            expect(() => guard.canActivate(handler)).toThrow(ForbiddenException)
            try {
              guard.canActivate(handler)
              throw new Error('A disabled feature unexpectedly returned true')
            } catch (error) {
              expect(error).toBeInstanceOf(ForbiddenException)
              expect((error as ForbiddenException).getStatus()).toBe(403)
            }
          }
        }
      }
    }
  })

  it('enforces BOTH flags for Notebook mutations that reference synthesis', () => {
    const reflector = new Reflector()
    for (const [target, method] of synthesisLinks) {
      const required = reflector.getAllAndMerge<string[]>(
        REQUIRED_FEATURES_METADATA,
        [target, contextFor(target, method).getHandler()]
      )
      expect(required).toEqual(['notebook', 'synthesis'])
    }
  })

  it.each([
    [false, false], [true, false], [false, true], [true, true]
  ])('requires notebook=%s AND synthesis=%s for every synthesis link', (notebook, synthesis) => {
    // Simulate future partial activation without changing either compiled flag map.
    jest.spyOn(featureFlags, 'isFeatureEnabled').mockImplementation((_env, feature) =>
      feature === 'notebook' ? notebook : synthesis)
    const guard = guardFor(Environment.Production)
    for (const [target, method] of synthesisLinks) {
      const context = contextFor(target, method)
      if (notebook && synthesis) {
        expect(guard.canActivate(context)).toBe(true)
      } else {
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
      }
    }
  })

  it('fails closed for an unknown environment or feature', () => {
    expect(() => guardFor('unknown' as Environment).canActivate(
      contextFor(LabNotebookDomainResolver, 'labNotebook')
    )).toThrow(ForbiddenException)
    expect(featureFlags.isFeatureEnabled(Environment.Production, 'unknown' as FeatureName)).toBe(false)
  })

  it('maps disabled GraphQL feature errors to HTTP status 403 using the canonical formatter', () => {
    const error = new ForbiddenException('FEATURE_DISABLED')
    const normalized = presentApplicationError(error, {
      correlationId: 'feature-disabled-contract-test',
      isProduction: true
    })
    expect(normalized.status).toBe(403)
    expect(normalized.code).toBe('FORBIDDEN')
    expect(graphQLStatusForPresentation(normalized)).toBe(403)
  })

  it('does not block unrelated product operations', () => {
    class ActiveProductService { run(): void {} }
    const getOrThrow = jest.fn()
    const guard = new FeatureAccessGuard(new Reflector(), { getOrThrow } as unknown as ConfigService)
    const context = contextFor(ActiveProductService, 'run')
    expect(guard.canActivate(context)).toBe(true)
    expect(getOrThrow).not.toHaveBeenCalled()
  })

  it('pins all 46 GraphQL root operations to protected resolvers', () => {
    const schema = buildSchema(readFileSync(resolve(__dirname, '../schema.graphql'), 'utf8'))
    const queries = Object.keys(schema.getQueryType()?.getFields() ?? {})
    const mutations = Object.keys(schema.getMutationType()?.getFields() ?? {})
    const notebookQueries = queries.filter(name =>
      /^(labNotebook|notebookSection|notebookExperiment|experimentExecution|experimentProtocolRevision)/.test(name))
    const notebookMutations = mutations.filter(name =>
      /^(createLabNotebook|updateLabNotebook|archiveLabNotebook|createNotebook|updateNotebook|archiveNotebook|reorderNotebook|createExperimentExecution|updateExperimentExecution|startExperimentExecution|completeExperimentExecution|cancelExperimentExecution|archiveExperimentExecution|reorderExperimentExecution|linkSynthesisToExperiment|unlinkSynthesisFromExperiment|linkSynthesisToExecution|linkMoleculeToExecution)/.test(name))
    const synthQueries = queries.filter(name =>
      /^(mySynthetic|synthetic|synthStep)/.test(name))
    const synthMutations = mutations.filter(name =>
      /^(createSynthetic|updateSynthetic|deleteSynthetic|configureSynthesisPool|addSynthStep|updateSynthStep|removeSynthStep)/.test(name))

    expect(notebookQueries).toHaveLength(10)
    expect(notebookMutations).toHaveLength(21)
    expect(synthQueries).toHaveLength(5)
    expect(synthMutations).toHaveLength(10)

    const documentation = readFileSync(resolve(
      __dirname, '../../../docs/architecture/mercurion-beta-deferred-feature-flags.md'
    ), 'utf8')
    const documentedRoots = documentation.split('\n')
      .filter(line => /^\| (Notebook|Synthesis) \(/.test(line))
      .flatMap(line => Array.from(line.matchAll(/`([^`]+)`/g), match => match[1]))
    expect(documentedRoots.sort()).toEqual([
      ...notebookQueries, ...notebookMutations, ...synthQueries, ...synthMutations
    ].sort())

    for (const [names, targets, feature] of [
      [[...notebookQueries, ...notebookMutations], notebookResolvers, 'notebook'],
      [[...synthQueries, ...synthMutations], synthesisResolvers, 'synthesis']
    ] as const) {
      for (const name of names) {
        const owners = targets.filter(target => ownMethods(target).includes(name))
        expect(owners.map(x => x.name)).toHaveLength(1)
        expect(Reflect.getMetadata(REQUIRED_FEATURES_METADATA, owners[0])).toContain(feature)
      }
    }
  })

  it('prevents nested access to scientific types through an unrelated GraphQL root', () => {
    // Class guards protect root operations; GraphQL does not enable
    // fieldResolverEnhancers by default. Reject accidental cross-domain fields.
    const schema = buildSchema(readFileSync(resolve(__dirname, '../schema.graphql'), 'utf8'))
    const deferredTypes = new Set([
      'LabNotebook', 'NotebookSection', 'NotebookExperiment',
      'ExperimentExecution', 'ExperimentProtocolRevision',
      'Synthesis', 'SynthStep', 'SynthStepItem',
      'SynthesisPoolMolecule', 'SynthesisPoolCollection'
    ])
    const unguardedReferences: string[] = []
    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type) || type.name.startsWith('__') ||
          type.name === 'Query' || type.name === 'Mutation' ||
          deferredTypes.has(type.name)) continue
      for (const [name, field] of Object.entries(type.getFields())) {
        if (deferredTypes.has(getNamedType(field.type).name)) {
          unguardedReferences.push(`${type.name}.${name}`)
        }
      }
    }
    expect(unguardedReferences).toEqual([])
  })

  it('covers exactly four public DocumentController handlers', () => {
    expect(ownMethods(DocumentController).sort()).toEqual([
      'upload', 'download', 'delete', 'list'
    ].sort())
  })
})
