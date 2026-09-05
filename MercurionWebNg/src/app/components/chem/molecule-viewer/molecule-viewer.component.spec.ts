import { ComponentFixture, TestBed } from '@angular/core/testing'
import { signal, SimpleChange } from '@angular/core'

import {
  ChemistryRenderRequest,
  ChemistryRendererSession
} from '../../../chemistry/chemistry-adapter.models'
import { ChemistryRendererService } from '../../../chemistry/chemistry-renderer.service'
import { ThemeManagerService } from '../../../services/context/theme-manager.service'
import { MoleculeViewerComponent } from './molecule-viewer.component'

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
  reject(reason: unknown): void
}

interface ScheduledIdleCallback {
  id: number
  callback: () => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('MoleculeViewerComponent', () => {
  let fixture: ComponentFixture<MoleculeViewerComponent>
  let component: MoleculeViewerComponent
  let session: jasmine.SpyObj<ChemistryRendererSession>
  let renderer: jasmine.SpyObj<ChemistryRendererService>
  let theme: ReturnType<typeof signal<'light' | 'dark'>>
  let scheduled: ScheduledIdleCallback[]
  let nextIdleId: number
  let cancelIdleCallbackSpy: jasmine.Spy

  beforeEach(async () => {
    session = createSession()
    renderer = jasmine.createSpyObj<ChemistryRendererService>('ChemistryRendererService', ['createSession'])
    renderer.createSession.and.resolveTo(session)
    theme = signal<'light' | 'dark'>('light')
    scheduled = []
    nextIdleId = 1

    spyOn(window as any, 'requestIdleCallback').and.callFake((callback: () => void) => {
      const id = nextIdleId++
      scheduled.push({ id, callback })
      return id
    })
    cancelIdleCallbackSpy = spyOn(window as any, 'cancelIdleCallback').and.callFake((id: number) => {
      scheduled = scheduled.filter(item => item.id !== id)
    })

    await TestBed.configureTestingModule({
      imports: [MoleculeViewerComponent],
      providers: [
        { provide: ChemistryRendererService, useValue: renderer },
        { provide: ThemeManagerService, useValue: { theme } }
      ]
    }).compileComponents()
  })

  afterEach(() => {
    if (fixture && !fixture.componentRef.hostView.destroyed) fixture.destroy()
  })

  it('creates and deterministically disposes an application renderer session', async () => {
    await createViewer('CC')

    expect(renderer.createSession).toHaveBeenCalledTimes(1)
    expect(session.dispose).not.toHaveBeenCalled()

    fixture.destroy()

    expect(session.dispose).toHaveBeenCalledTimes(1)
    expect(scheduled).toEqual([])
  })

  it('disposes a session that becomes ready after the viewer was destroyed', async () => {
    const pendingSession = deferred<ChemistryRendererSession>()
    renderer.createSession.and.returnValue(pendingSession.promise)
    createViewerWithoutWaiting('CC')

    fixture.destroy()
    pendingSession.resolve(session)
    await flushPromises()

    expect(session.dispose).toHaveBeenCalledTimes(1)
    expect(session.renderSvg).not.toHaveBeenCalled()
    expect(scheduled).toEqual([])
  })

  it('ignores a render that completes after the viewer was destroyed', async () => {
    const pendingRender = deferred<string>()
    session.renderSvg.and.returnValue(pendingRender.promise)
    await createViewer('CC')
    runScheduledRender()
    const renderedSpy = spyOn(component.rendered, 'emit')

    fixture.destroy()
    pendingRender.resolve('<svg data-render="destroyed"></svg>')
    await flushPromises()

    expect(component.svg).toBeNull()
    expect(renderedSpy).not.toHaveBeenCalled()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('lets the latest structure render win when older work completes later', async () => {
    const firstRender = deferred<string>()
    const latestRender = deferred<string>()
    session.renderSvg.and.callFake((request: ChemistryRenderRequest) => {
      return request.structure === 'first' ? firstRender.promise : latestRender.promise
    })
    await createViewer()
    runScheduledRender()
    const renderedSpy = spyOn(component.rendered, 'emit')

    changeStructure('first')
    runScheduledRender()
    changeStructure('latest')
    runScheduledRender()

    latestRender.resolve('<svg data-render="latest"></svg>')
    await flushPromises()
    fixture.detectChanges()
    expect(renderedSvgMarker()).toBe('latest')

    firstRender.resolve('<svg data-render="first"></svg>')
    await flushPromises()
    fixture.detectChanges()

    expect(renderedSvgMarker()).toBe('latest')
    expect(renderedSpy).toHaveBeenCalledTimes(1)
  })

  it('supersedes a stale theme render without publishing its result or error', async () => {
    const lightRender = deferred<string>()
    const darkRender = deferred<string>()
    session.renderSvg.and.callFake((request: ChemistryRenderRequest) => {
      return request.options.background[0] < 0.1 ? darkRender.promise : lightRender.promise
    })
    await createViewer('CC')
    runScheduledRender()

    theme.set('dark')
    fixture.detectChanges()
    runScheduledRender()

    darkRender.resolve('<svg data-render="dark"></svg>')
    await flushPromises()
    fixture.detectChanges()
    expect(renderedSvgMarker()).toBe('dark')

    lightRender.reject(new Error('stale render failed'))
    await flushPromises()
    fixture.detectChanges()

    expect(renderedSvgMarker()).toBe('dark')
    expect(component.renderState()).toBe('ready')
  })

  it('cancels superseded idle callbacks and cancels the final callback on destroy', async () => {
    await createViewer('CC')
    expect(scheduled.length).toBe(1)

    changeStructure('CCC')

    expect(cancelIdleCallbackSpy).toHaveBeenCalled()
    expect(scheduled.length).toBe(1)

    fixture.destroy()
    expect(scheduled).toEqual([])
  })

  it('stops and disposes renderer work while preview rendering is disabled', async () => {
    await createViewer('CC')
    component.disablePreview = true
    component.ngOnChanges({
      disablePreview: new SimpleChange(false, true, false)
    })

    expect(session.dispose).toHaveBeenCalledTimes(1)
    expect(scheduled).toEqual([])
  })

  it('renders a controlled recoverable state when the adapter cannot load', async () => {
    renderer.createSession.and.rejectWith(new Error('vendor detail'))
    await createViewer('CC')
    fixture.detectChanges()

    expect(component.renderState()).toBe('unavailable')
    expect(component.renderError()).toBe('Rappresentazione molecolare non disponibile.')
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('repeatedly mounts and unmounts without retaining sessions or scheduled work', async () => {
    const sessions: jasmine.SpyObj<ChemistryRendererSession>[] = []
    renderer.createSession.and.callFake(() => {
      const nextSession = createSession()
      sessions.push(nextSession)
      return Promise.resolve(nextSession)
    })

    for (let index = 0; index < 5; index += 1) {
      await createViewer(`C${index}`)
      expect(scheduled.length).toBe(1)
      fixture.destroy()
      expect(scheduled).toEqual([])
    }

    expect(sessions).toHaveSize(5)
    for (const ownedSession of sessions) {
      expect(ownedSession.dispose).toHaveBeenCalledTimes(1)
      expect(ownedSession.renderSvg).not.toHaveBeenCalled()
    }
  })

  function createSession(): jasmine.SpyObj<ChemistryRendererSession> {
    const nextSession = jasmine.createSpyObj<ChemistryRendererSession>(
      'ChemistryRendererSession',
      ['renderSvg', 'toMolfile', 'getMoleculeProperties', 'dispose']
    )
    nextSession.renderSvg.and.resolveTo('<svg viewBox="0 0 10 10"></svg>')
    return nextSession
  }

  function createViewerWithoutWaiting(structure = ''): void {
    fixture = TestBed.createComponent(MoleculeViewerComponent)
    component = fixture.componentInstance
    component.structure = structure
    fixture.detectChanges()
  }

  async function createViewer(structure = ''): Promise<void> {
    createViewerWithoutWaiting(structure)
    await flushPromises()
  }

  function changeStructure(structure: string): void {
    const previous = component.structure
    component.structure = structure
    component.ngOnChanges({
      structure: new SimpleChange(previous, structure, false)
    })
  }

  function runScheduledRender(): void {
    expect(scheduled.length).toBe(1)
    const [{ callback }] = scheduled.splice(0, 1)
    callback()
  }

  function renderedSvgMarker(): string | null {
    return fixture.nativeElement.querySelector('svg')?.getAttribute('data-render') ?? null
  }

  async function flushPromises(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
  }
})
