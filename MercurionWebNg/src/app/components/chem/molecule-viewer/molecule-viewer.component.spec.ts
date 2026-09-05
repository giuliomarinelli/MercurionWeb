import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SimpleChange } from '@angular/core'

import { ChemistryRendererSession } from '../../../chemistry/chemistry-adapter.models'
import { ChemistryRendererService } from '../../../chemistry/chemistry-renderer.service'
import { MoleculeViewerComponent } from './molecule-viewer.component'

describe('MoleculeViewerComponent', () => {
  let component: MoleculeViewerComponent
  let fixture: ComponentFixture<MoleculeViewerComponent>
  let session: jasmine.SpyObj<ChemistryRendererSession>
  let renderer: jasmine.SpyObj<ChemistryRendererService>

  beforeEach(async () => {
    session = jasmine.createSpyObj<ChemistryRendererSession>(
      'ChemistryRendererSession',
      ['renderSvg', 'toMolfile', 'getMoleculeProperties', 'dispose']
    )
    session.renderSvg.and.resolveTo('<svg viewBox="0 0 10 10"></svg>')
    renderer = jasmine.createSpyObj<ChemistryRendererService>('ChemistryRendererService', ['createSession'])
    renderer.createSession.and.resolveTo(session)

    await TestBed.configureTestingModule({
      imports: [MoleculeViewerComponent],
      providers: [{ provide: ChemistryRendererService, useValue: renderer }]
    }).compileComponents()

    fixture = TestBed.createComponent(MoleculeViewerComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
    await fixture.whenStable()
  })

  it('creates a renderer session without exposing an RDKit type to the component', () => {
    expect(component).toBeTruthy()
    expect(renderer.createSession).toHaveBeenCalledTimes(1)
  })

  it('disposes its application renderer session when destroyed', () => {
    fixture.destroy()
    expect(session.dispose).toHaveBeenCalledTimes(1)
  })

  it('renders a controlled recoverable state when the adapter cannot load', async () => {
    session.dispose.calls.reset()
    renderer.createSession.and.rejectWith(new Error('vendor detail'))

    component.retry()
    await Promise.resolve()
    await Promise.resolve()
    fixture.detectChanges()

    expect(component.renderState()).toBe('unavailable')
    expect(component.renderError()).toBe('Rappresentazione molecolare non disponibile.')
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull()
  })

  it('starts loading when preview is enabled after being disabled', () => {
    renderer.createSession.calls.reset()
    component.disablePreview = true
    ;(component as any).ready = false
    component.disablePreview = false
    component.ngOnChanges({
      disablePreview: new SimpleChange(true, false, false)
    })

    expect(renderer.createSession).toHaveBeenCalledTimes(1)
  })

  describe('scheduleRender idle-job ownership', () => {
    let cancelIdleCallbackSpy: jasmine.Spy
    let scheduled: { id: number; callback: () => void }[]
    let nextId: number

    beforeEach(() => {
      scheduled = []
      nextId = 1
      spyOn(window as any, 'requestIdleCallback').and.callFake((callback: any) => {
        const id = nextId++
        scheduled.push({ id, callback: () => callback({ didTimeout: true, timeRemaining: () => 0 }) })
        return id
      })
      cancelIdleCallbackSpy = spyOn(window as any, 'cancelIdleCallback').and.callFake((id: number) => {
        scheduled = scheduled.filter(item => item.id !== id)
      })

      ;(component as any).scheduleRender()
      cancelIdleCallbackSpy.calls.reset()
    })

    it('cancels the previous idle callback before scheduling another render', () => {
      expect(scheduled.length).toBe(1)
      ;(component as any).scheduleRender()
      expect(cancelIdleCallbackSpy).toHaveBeenCalledTimes(1)
      expect(scheduled.length).toBe(1)
    })

    it('cancels the pending idle callback on destroy', () => {
      fixture.destroy()
      expect(cancelIdleCallbackSpy).toHaveBeenCalledTimes(1)
    })
  })
})
