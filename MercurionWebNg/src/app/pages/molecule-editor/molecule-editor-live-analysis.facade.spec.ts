import { TestBed } from '@angular/core/testing'
import { Subject, of } from 'rxjs'

import type { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface'
import type { T1PredictionDTO } from '../../Models/notebook/t1-prediction-model'
import { EmbeddingService } from '../../services/embedding.service'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { LoggerService } from '../../services/logger.service'
import { MercurionAiService } from '../../services/mercurion-ai.service'
import { MoleculeEditorLiveAnalysisFacade } from './molecule-editor-live-analysis.facade'

describe('MoleculeEditorLiveAnalysisFacade', () => {
  let facade: MoleculeEditorLiveAnalysisFacade
  let ai: jasmine.SpyObj<MercurionAiService>
  let embedding: jasmine.SpyObj<EmbeddingService>
  let molecules: jasmine.SpyObj<MoleculeService>

  const prediction: T1PredictionDTO = {
    'SR-ATAD5': { probability: 0.2, threshold: 0.5, is_positive: false },
    'NR-AhR': { probability: 0.8, threshold: 0.5, is_positive: true },
    'SR-MMP': { probability: 0.1, threshold: 0.5, is_positive: false },
    'SR-p53': { probability: 0.3, threshold: 0.5, is_positive: false }
  }

  const previews = [
    {
      id: 11,
      preferredName: 'Analog A',
      preferredNameIt: 'Analogo A',
      smiles: 'CCC',
      synonyms: [],
      mwFreebase: 44,
      alogp: 1,
      maxPhase: 2
    },
    {
      id: 22,
      preferredName: 'Analog B',
      preferredNameIt: 'Analogo B',
      smiles: 'CCCC',
      synonyms: [],
      mwFreebase: 58,
      alogp: 1.5,
      maxPhase: 1
    }
  ] as MoleculeSearchResult[]

  beforeEach(() => {
    ai = jasmine.createSpyObj<MercurionAiService>('MercurionAiService', ['t1Inference'])
    embedding = jasmine.createSpyObj<EmbeddingService>('EmbeddingService', ['getSimilarBySmiles'])
    molecules = jasmine.createSpyObj<MoleculeService>('MoleculeService', ['getMoleculePreviewsByMolregnos'])

    ai.t1Inference.and.returnValue(of(prediction))
    embedding.getSimilarBySmiles.and.returnValue(of([11, 22]))
    molecules.getMoleculePreviewsByMolregnos.and.returnValue(of(previews))

    TestBed.configureTestingModule({
      providers: [
        MoleculeEditorLiveAnalysisFacade,
        { provide: MercurionAiService, useValue: ai },
        { provide: EmbeddingService, useValue: embedding },
        { provide: MoleculeService, useValue: molecules },
        { provide: LoggerService, useValue: { error: jasmine.createSpy('error') } }
      ]
    })

    facade = TestBed.inject(MoleculeEditorLiveAnalysisFacade)
    TestBed.flushEffects()
  })

  it('does not call live analysis services while the live tab is disabled', () => {
    facade.setContext('CCO', false)
    TestBed.flushEffects()

    expect(ai.t1Inference).not.toHaveBeenCalled()
    expect(embedding.getSimilarBySmiles).not.toHaveBeenCalled()
  })

  it('loads Tox21 and the top analog previews independently for the canonical SMILES', () => {
    const delayedTox = new Subject<T1PredictionDTO>()
    ai.t1Inference.and.returnValue(delayedTox)

    facade.setContext('CCO', true)
    TestBed.flushEffects()

    expect(facade.toxLoading()).toBeTrue()
    expect(facade.analogsLoading()).toBeFalse()
    expect(facade.analogs()).toEqual(previews)
    expect(embedding.getSimilarBySmiles).toHaveBeenCalledOnceWith('CCO', 3, false, true)
    expect(molecules.getMoleculePreviewsByMolregnos).toHaveBeenCalledOnceWith(['11', '22'])

    delayedTox.next(prediction)
    delayedTox.complete()

    expect(facade.toxPrediction()).toEqual(prediction)
    expect(facade.toxLoading()).toBeFalse()
  })

  it('marks analogs unavailable when the structure has no seed in the embedding corpus', () => {
    embedding.getSimilarBySmiles.and.returnValue(of([]))

    facade.setContext('N#N', true)
    TestBed.flushEffects()

    expect(facade.analogs()).toEqual([])
    expect(facade.analogsUnavailable()).toBeTrue()
    expect(molecules.getMoleculePreviewsByMolregnos).not.toHaveBeenCalled()
  })

  it('ignores stale analysis responses after the canonical structure changes', () => {
    const firstTox = new Subject<T1PredictionDTO>()
    const secondTox = new Subject<T1PredictionDTO>()
    const firstAnalogs = new Subject<number[]>()
    const secondAnalogs = new Subject<number[]>()

    ai.t1Inference.and.returnValues(firstTox, secondTox)
    embedding.getSimilarBySmiles.and.returnValues(firstAnalogs, secondAnalogs)

    facade.setContext('CCO', true)
    TestBed.flushEffects()

    facade.setContext('CCN', true)
    TestBed.flushEffects()

    firstTox.next(prediction)
    firstTox.complete()
    firstAnalogs.next([11])
    firstAnalogs.complete()

    expect(facade.toxPrediction()).toBeNull()
    expect(facade.analogs()).toEqual([])

    secondTox.next(prediction)
    secondTox.complete()
    secondAnalogs.next([22])
    secondAnalogs.complete()

    expect(facade.toxPrediction()).toEqual(prediction)
    expect(molecules.getMoleculePreviewsByMolregnos).toHaveBeenCalledWith(['22'])
  })

  it('reuses cached live analysis when returning to the same canonical structure', () => {
    facade.setContext('CCO', true)
    TestBed.flushEffects()

    facade.setContext('CCO', false)
    TestBed.flushEffects()
    facade.setContext('CCO', true)
    TestBed.flushEffects()

    expect(ai.t1Inference).toHaveBeenCalledTimes(1)
    expect(embedding.getSimilarBySmiles).toHaveBeenCalledTimes(1)
    expect(facade.toxPrediction()).toEqual(prediction)
    expect(facade.analogs()).toEqual(previews)
  })
})
