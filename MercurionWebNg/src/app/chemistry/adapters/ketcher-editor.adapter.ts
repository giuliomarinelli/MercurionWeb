import {
  ChemistryAdapterError,
  ChemistryCapabilityState,
  ChemistryEditorSession
} from '../chemistry-adapter.models'

export interface KetcherEditorAdapterOptions {
  resourceUrl: string
  targetOrigin: string
  toMolfile(structure: string): Promise<string | undefined>
}

class KetcherEditorSession implements ChemistryEditorSession {
  readonly resourceUrl: string

  private disposed = false
  private frame?: HTMLIFrameElement
  private ready = false
  private readyResolve?: () => void
  private readyReject?: (error: ChemistryAdapterError) => void
  private readonly readyPromise: Promise<void>
  private readyTimeoutId?: ReturnType<typeof setTimeout>
  private state: ChemistryCapabilityState = { status: 'loading' }
  private readonly stateListeners = new Set<(state: ChemistryCapabilityState) => void>()
  private pendingSmilesResolve?: (smiles: string) => void
  private pendingSmilesReject?: (error: ChemistryAdapterError) => void
  private pendingStructureResolve?: () => void
  private pendingStructureReject?: (error: ChemistryAdapterError) => void
  private operationQueue = Promise.resolve()

  constructor(private readonly options: KetcherEditorAdapterOptions) {
    this.resourceUrl = options.resourceUrl
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })
    void this.readyPromise.catch(() => undefined)
    window.addEventListener('message', this.onMessage)
  }

  attach(frame: HTMLIFrameElement): void {
    if (this.disposed) return
    this.frame = frame
    this.armReadyTimeout()
  }

  onStateChange(listener: (state: ChemistryCapabilityState) => void): () => void {
    this.stateListeners.add(listener)
    listener(this.state)
    return () => this.stateListeners.delete(listener)
  }

  setStructure(structure: string): Promise<void> {
    const operation = this.operationQueue.then(() => this.applyStructure(structure))
    this.operationQueue = operation.then(() => undefined, () => undefined)
    return operation
  }

  exportStructure(): Promise<string> {
    const operation = this.operationQueue.then(() => this.requestSmiles())
    this.operationQueue = operation.then(() => undefined, () => undefined)
    return operation
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    window.removeEventListener('message', this.onMessage)
    clearTimeout(this.readyTimeoutId)

    const error = new ChemistryAdapterError('unavailable', 'La sessione editor non è più disponibile.', false)
    this.readyReject?.(error)
    this.pendingSmilesReject?.(error)
    this.pendingStructureReject?.(error)
    this.stateListeners.clear()
    this.frame = undefined
  }

  private async applyStructure(structure: string): Promise<void> {
    await this.readyPromise

    if (this.disposed) {
      throw new ChemistryAdapterError('unavailable', 'La sessione editor non è più disponibile.', false)
    }

    let payload = ''
    if (structure.trim()) {
      const molfile = await this.options.toMolfile(structure)
      if (!molfile) {
        throw new ChemistryAdapterError('invalid-structure', 'La struttura non può essere caricata nell’editor.')
      }
      payload = molfile
    }

    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingStructureResolve = undefined
        this.pendingStructureReject = undefined
        reject(new ChemistryAdapterError('operation-failed', 'Ketcher non ha confermato il caricamento della struttura in tempo.'))
      }, 3_000)

      this.pendingStructureResolve = () => {
        clearTimeout(timeoutId)
        this.pendingStructureResolve = undefined
        this.pendingStructureReject = undefined
        resolve()
      }

      this.pendingStructureReject = error => {
        clearTimeout(timeoutId)
        this.pendingStructureResolve = undefined
        this.pendingStructureReject = undefined
        reject(error)
      }

      this.postMessage({ type: 'setMolecule', payload })
    })
  }

  private requestSmiles(): Promise<string> {
    return this.readyPromise.then(() => new Promise<string>((resolve, reject) => {
      if (this.disposed) {
        reject(new ChemistryAdapterError('unavailable', 'La sessione editor non è più disponibile.', false))
        return
      }

      const timeoutId = setTimeout(() => {
        this.pendingSmilesResolve = undefined
        this.pendingSmilesReject = undefined
        reject(new ChemistryAdapterError('operation-failed', 'Ketcher non ha restituito la struttura in tempo.'))
      }, 3_000)

      this.pendingSmilesResolve = smiles => {
        clearTimeout(timeoutId)
        resolve(smiles)
      }
      this.pendingSmilesReject = error => {
        clearTimeout(timeoutId)
        reject(error)
      }
      this.postMessage({ type: 'getSmiles', payload: {} })
    }))
  }

  private readonly onMessage = (event: MessageEvent): void => {
    if (this.disposed || !event.data) return
    if (this.frame?.contentWindow && event.source !== this.frame.contentWindow) return

    const message = event.data as { type?: unknown; payload?: unknown }
    if (message.type === 'ketcherReady') {
      this.ready = true
      clearTimeout(this.readyTimeoutId)
      this.readyResolve?.()
      this.updateState({ status: 'ready' })
      return
    }

    if (message.type === 'moleculeSet' && this.pendingStructureResolve) {
      this.pendingStructureResolve()
      return
    }

    if (message.type === 'moleculeSetError' && this.pendingStructureReject) {
      this.pendingStructureReject(
        new ChemistryAdapterError('operation-failed', 'Ketcher non è riuscito a caricare la struttura.')
      )
      return
    }

    if (message.type === 'smiles' && this.pendingSmilesResolve) {
      const resolve = this.pendingSmilesResolve
      this.pendingSmilesResolve = undefined
      this.pendingSmilesReject = undefined
      resolve(typeof message.payload === 'string' ? message.payload : '')
    }
  }

  private armReadyTimeout(): void {
    if (this.ready || this.readyTimeoutId) return
    this.readyTimeoutId = setTimeout(() => {
      const error = new ChemistryAdapterError(
        'initialization-timeout',
        'L’editor molecolare non ha risposto in tempo.'
      )
      this.readyReject?.(error)
      this.updateState({ status: 'unavailable', error })
    }, 15_000)
  }

  private postMessage(message: { type: string; payload: unknown }): void {
    const target = this.frame?.contentWindow
    if (!target) {
      throw new ChemistryAdapterError('unavailable', 'L’editor molecolare non è disponibile.')
    }
    target.postMessage(message, this.options.targetOrigin)
  }

  private updateState(state: ChemistryCapabilityState): void {
    this.state = state
    this.stateListeners.forEach(listener => listener(state))
  }
}

export function createKetcherEditorAdapter(options: KetcherEditorAdapterOptions): ChemistryEditorSession {
  return new KetcherEditorSession(options)
}
