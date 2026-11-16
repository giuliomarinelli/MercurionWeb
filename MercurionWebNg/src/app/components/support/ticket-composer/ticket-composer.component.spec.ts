import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TicketComposerComponent } from './ticket-composer.component'
import { blockingViolations, runAxe } from '../../../testing/accessibility-test.helpers.spec'

describe('TicketComposerComponent document and draft', () => {
  let fixture: ComponentFixture<TicketComposerComponent>
  let component: TicketComposerComponent
  let editorReady: Promise<void>
  let originalDark: boolean

  beforeEach(async () => {
    originalDark = document.documentElement.classList.contains('dark')
    TestBed.configureTestingModule({ imports: [TicketComposerComponent] })
    fixture = TestBed.createComponent(TicketComposerComponent)
    component = fixture.componentInstance
    editorReady = new Promise(resolve => {
      const configure = component.configureEditor.bind(component)
      spyOn(component, 'configureEditor').and.callFake(editor => {
        configure(editor)
        resolve()
      })
    })
    fixture.detectChanges()
    await fixture.whenStable()
  })

  afterEach(() => document.documentElement.classList.toggle('dark', originalDark))

  function compose() {
    component.contentHtml = '<p>Prima e seconda parte</p>'
    const event = {
      content: { ops: [{ insert: 'Prima e seconda parte\n' }] },
      delta: { ops: [{ retain: 5 }, { insert: ' e seconda parte' }] },
      text: 'Prima e seconda parte\n',
    }
    component.onChanged(event)
  }

  it('sends the full document, not the incremental Quill delta', () => {
    const send = jasmine.createSpy('send')
    component.send.subscribe(send)
    compose()
    component.sendMsg()
    expect(send).toHaveBeenCalledWith({
      html: '<p>Prima e seconda parte</p>',
      delta: { ops: [{ insert: 'Prima e seconda parte\n' }] },
    })
  })

  it('retains the draft until the server confirms delivery', () => {
    compose()
    component.sendMsg()
    expect(component.contentHtml).toBe('<p>Prima e seconda parte</p>')
    expect(component.canSend()).toBeTrue()
  })

  it('does not emit again while a request is pending', () => {
    const send = jasmine.createSpy('send')
    component.send.subscribe(send)
    compose()
    fixture.componentRef.setInput('pending', true)
    fixture.detectChanges()
    component.sendMsg()
    expect(send).not.toHaveBeenCalled()
  })

  it('clears the document only when the confirmation revision advances', () => {
    fixture.componentRef.setInput('sentRevision', 0)
    fixture.detectChanges()
    compose()
    fixture.componentRef.setInput('error', 'Invio non confermato')
    fixture.detectChanges()
    expect(component.contentHtml).toContain('Prima e seconda parte')
    fixture.componentRef.setInput('sentRevision', 1)
    fixture.detectChanges()
    expect(component.contentHtml).toBe('')
    expect(component.canSend()).toBeFalse()
  })

  it('preserves a draft when the ticket is remotely closed and blocks sending', () => {
    const send = jasmine.createSpy('send')
    component.send.subscribe(send)
    compose()
    fixture.componentRef.setInput('disabled', true)
    fixture.componentRef.setInput('closed', true)
    fixture.detectChanges()
    component.sendMsg()
    expect(send).not.toHaveBeenCalled()
    expect(component.contentHtml).toContain('Prima e seconda parte')
    expect(fixture.nativeElement.textContent).toContain('Il ticket è chiuso')
  })

  for (const theme of ['light', 'dark']) {
    it(`labels the real editor and preserves contrast and all nine actions in ${theme}`, async () => {
      document.documentElement.classList.toggle('dark', theme === 'dark')
      await editorReady
      const editor = fixture.nativeElement.querySelector('.ql-editor') as HTMLElement
      expect(editor.getAttribute('role')).toBe('textbox')
      expect(editor.getAttribute('aria-labelledby')).toBe('ticket-reply-label')
      const buttons = [...fixture.nativeElement.querySelectorAll('.ql-toolbar button')] as HTMLButtonElement[]
      expect(buttons.length).toBe(9)
      expect(buttons.every(button => !!button.getAttribute('aria-label'))).toBeTrue()
      expect(blockingViolations(await runAxe(fixture.nativeElement))).toEqual([])
    })
  }
})
