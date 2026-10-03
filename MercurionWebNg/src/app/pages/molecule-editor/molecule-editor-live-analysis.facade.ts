import { Injectable, effect, inject, signal } from '@angular/core'
import { catchError, map, of, switchMap } from 'rxjs'

import type { MoleculeSearchResult } from '../../Models/graphql/molecule-search/molecule-search-result.interface'
import type { T1PredictionDTO } from '../../Models/notebook/t1-prediction-model'
import { EmbeddingService } from '../../services/embedding.service'
import { MoleculeService } from '../../services/graphql/molecule.service'
import { LoggerService } from '../../services/logger.service'
import { MercurionAiService } from '../../services/mercurion-ai.service'

@Injectable()
export class MoleculeEditorLiveAnalysisFacade {

  private readonly ai = inject(MercurionAiService)
  private readonly embedding = inject(EmbeddingService)
  private readonly molecules = inject(MoleculeService)
  private readonly logger = inject(LoggerService)

  private readonly canonicalSmiles = signal('')
  private readonly enabled = signal(false)

  private readonly toxCache = new Map<string, T1PredictionDTO>()
  private readonly analogCache = new Map<string, readonly MoleculeSearchResult[]>()

  readonly toxPrediction = signal<T1PredictionDTO | null>(null)
  readonly toxLoading = signal(false)
  readonly toxError = signal(false)

  readonly analogs = signal<readonly MoleculeSearchResult[]>([])
  readonly analogsLoading = signal(false)
  readonly analogsError = signal(false)
  readonly analogsUnavailable = signal(false)

  constructor() {
    effect(onCleanup => {
      const enabled = this.enabled()
      const smiles = this.canonicalSmiles()

      if (!enabled || !smiles) {
        this.resetVisibleState()
        return
      }

      const cachedTox = this.toxCache.get(smiles)
      if (cachedTox) {
        this.toxPrediction.set(cachedTox)
        this.toxLoading.set(false)
        this.toxError.set(false)
      } else {
        this.toxPrediction.set(null)
        this.toxLoading.set(true)
        this.toxError.set(false)
      }

      const cachedAnalogs = this.analogCache.get(smiles)
      if (cachedAnalogs) {
        this.analogs.set(cachedAnalogs)
        this.analogsLoading.set(false)
        this.analogsError.set(false)
        this.analogsUnavailable.set(cachedAnalogs.length === 0)
      } else {
        this.analogs.set([])
        this.analogsLoading.set(true)
        this.analogsError.set(false)
        this.analogsUnavailable.set(false)
      }

      const toxSub = cachedTox
        ? undefined
        : this.ai.t1Inference({ smiles }).pipe(
            catchError(error => {
              if (this.canonicalSmiles() === smiles && this.enabled()) {
                this.logger.error('Live Tox21 inference failed', error)
                this.toxLoading.set(false)
                this.toxError.set(true)
              }
              return of(null)
            })
          ).subscribe(result => {
            if (!result || this.canonicalSmiles() !== smiles || !this.enabled()) return

            this.toxCache.set(smiles, result)
            this.toxPrediction.set(result)
            this.toxLoading.set(false)
            this.toxError.set(false)
          })

      const analogSub = cachedAnalogs
        ? undefined
        : this.embedding.getSimilarBySmiles(smiles, 3, false, true).pipe(
            map(results =>
              results.map(result =>
                typeof result === 'number'
                  ? String(result)
                  : String(result.molregno)
              )
            ),
            switchMap(molregnos =>
              molregnos.length
                ? this.molecules.getMoleculePreviewsByMolregnos(molregnos)
                : of([] as MoleculeSearchResult[])
            ),
            map(results => results.slice(0, 3)),
            catchError(error => {
              if (this.canonicalSmiles() === smiles && this.enabled()) {
                this.logger.error('Live molecule analog lookup failed', error)
                this.analogsLoading.set(false)
                this.analogsError.set(true)
                this.analogsUnavailable.set(false)
              }
              return of(null)
            })
          ).subscribe(results => {
            if (!results || this.canonicalSmiles() !== smiles || !this.enabled()) return

            this.analogCache.set(smiles, results)
            this.analogs.set(results)
            this.analogsLoading.set(false)
            this.analogsError.set(false)
            this.analogsUnavailable.set(results.length === 0)
          })

      onCleanup(() => {
        toxSub?.unsubscribe()
        analogSub?.unsubscribe()
      })
    })
  }

  setContext(canonicalSmiles: string, enabled: boolean): void {
    this.canonicalSmiles.set(canonicalSmiles.trim())
    this.enabled.set(enabled)
  }

  private resetVisibleState(): void {
    this.toxPrediction.set(null)
    this.toxLoading.set(false)
    this.toxError.set(false)

    this.analogs.set([])
    this.analogsLoading.set(false)
    this.analogsError.set(false)
    this.analogsUnavailable.set(false)
  }
}
