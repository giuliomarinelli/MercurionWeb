import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { buildSchema } from 'graphql'
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
import { FeatureAccessGuard } from './feature-access.guard'
import { REQUIRED_FEATURES_METADATA } from './feature-access.decorator'
import { FEATURE_FLAGS, type FeatureName } from './feature-flags'

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
const groups: ReadonlyArray<{ feature: FeatureName; classes: Array<Function> }> = [
  { feature: 'notebook', classes: notebookResolvers },
  { feature: 'synthesis', classes: synthesisResolvers },
  { feature: 'documents', classes: [DocumentController] }
]

function ownMethods(target: Function): string[] {
  return Object.getOwnPropertyNames(target.prototype).filter(name =>
    name !== 'constructor' && typeof target.prototype[name] === 'function'
  )
}

function contextFor(target: Function, method: string): ExecutionContext {
  return {
    getClass: () => target,
    getHandler: () => target.prototype[method]
  } as unknown as ExecutionContext
}

function guardFor(environment: Environment): FeatureAccessGuard {
  return new FeatureAccessGuard(
    new Reflector(),
    { getOrThrow: jest.fn().mockReturnValue(environment) } as unknown as ConfigService
  )
}

describe('Mercurion beta feature boundary coverage', () => {
  it('keeps all three features disabled in all four validated backend environments', () => {
    expect(Object.values(Environment)).toHaveLength(4)
    for (const environment of Object.values(Environment)) {
      for (const feature of ['notebook', 'synthesis', 'documents'] as const) {
        expect(FEATURE_FLAGS[environment][feature]).toBe(false)
      }
    }
  })

  it('has exactly five Notebook and four Synthesis resolver classes registered', () => {
    const providerNames = (module: Function) =>
      (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) as Function[])
        .filter(provider => provider.name.endsWith('Resolver'))
        .map(provider => provider.name)
        .sort()
    expect(providerNames(LabNotebookModule)).toEqual(notebookResolvers.map(x => x.name).sort())
    expect(providerNames(SynthModule)).toEqual(synthesisResolvers.map(x => x.name).sort())
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS, DropboxObjectStoreModule
    ) as Function[]
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
    for (const [target, method] of [
      [NotebookExperimentDomainResolver, 'linkSynthesisToExperiment'],
      [NotebookExperimentDomainResolver, 'unlinkSynthesisFromExperiment'],
      [ExperimentExecutionDomainResolver, 'linkSynthesisToExecution']
    ] as const) {
      const required = reflector.getAllAndMerge<string[]>(
        REQUIRED_FEATURES_METADATA,
        [target, target.prototype[method]]
      )
      expect(required).toEqual(['notebook', 'synthesis'])
    }
  })

  it('does not block unrelated product operations', () => {
    class ActiveProductService { run(): void {} }
    const context = contextFor(ActiveProductService, 'run')
    expect(guardFor(Environment.Production).canActivate(context)).toBe(true)
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

  it('covers exactly four public DocumentController handlers', () => {
    expect(ownMethods(DocumentController).sort()).toEqual([
      'upload', 'download', 'delete', 'list'
    ].sort())
  })
})
