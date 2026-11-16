import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TicketThreadComponent } from './ticket-thread.component'
import { toTicketMessageViewModel } from '../../../Models/graphql/help.view-models'

const message = (id: number) => toTicketMessageViewModel({
  id: `message-${id}`, publicId: `M-${id}`, ticketId: 'qa-ticket', authorType: 'User' as const,
  contentDelta: '{}', contentHtml: `<p>Messaggio ${id}</p><p>Seconda riga per la prova di lettura.</p>`,
  createdAt: String(1700000000000 + id * 1000),
})

describe('TicketThreadComponent reading position', () => {
  let fixture: ComponentFixture<TicketThreadComponent>
  let root: HTMLElement
  const initial = Array.from({ length: 15 }, (_, index) => message(index + 10))

  async function render() {
    fixture.detectChanges()
    await fixture.whenStable()
    fixture.detectChanges()
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TicketThreadComponent] })
    fixture = TestBed.createComponent(TicketThreadComponent)
    fixture.componentRef.setInput('messages', initial)
    fixture.componentRef.setInput('scope', 'User')
    fixture.componentRef.setInput('done', true)
    fixture.componentRef.setInput('sentRevision', 0)
    await render()
    root = fixture.nativeElement.querySelector('[aria-label="Messaggi del ticket"]')
  })

  it('opens on the latest message', () => {
    expect(root.scrollHeight).toBeGreaterThan(root.clientHeight)
    expect(Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop)).toBeLessThan(2)
  })

  it('keeps the same message at the same offset when older messages are prepended', async () => {
    root.scrollTop = 170
    const anchor = [...root.querySelectorAll<HTMLElement>('[data-message-id]')]
      .find(item => item.getBoundingClientRect().bottom > root.getBoundingClientRect().top)!
    const before = anchor.getBoundingClientRect().top - root.getBoundingClientRect().top
    fixture.componentRef.setInput('messages', [message(8), message(9), ...initial])
    await render()
    expect(Math.abs(anchor.getBoundingClientRect().top - root.getBoundingClientRect().top - before)).toBeLessThan(2)
  })

  it('does not move a reader in history when a new reply arrives', async () => {
    root.scrollTop = 130
    fixture.componentRef.setInput('messages', [...initial, message(25)])
    await render()
    expect(Math.abs(root.scrollTop - 130)).toBeLessThan(2)
    expect(fixture.nativeElement.textContent).toContain('Nuovi messaggi')
  })

  it('follows a new reply when already at the bottom', async () => {
    root.scrollTop = root.scrollHeight
    fixture.componentRef.setInput('messages', [...initial, message(25)])
    await render()
    expect(Math.abs(root.scrollHeight - root.clientHeight - root.scrollTop)).toBeLessThan(2)
  })

  it('does not automatically retry a failed page on scroll', async () => {
    const load = jasmine.createSpy('loadMore')
    fixture.componentInstance.loadMore.subscribe(load)
    fixture.componentRef.setInput('done', false)
    fixture.componentRef.setInput('pageError', 'Rete non disponibile')
    await render()
    root.scrollTop = 0
    fixture.componentInstance.onScroll()
    expect(load).not.toHaveBeenCalled()
    expect(fixture.nativeElement.textContent).toContain('Riprova caricamento')
  })
})
