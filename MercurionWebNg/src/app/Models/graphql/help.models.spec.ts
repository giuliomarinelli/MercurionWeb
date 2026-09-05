import {
  APIClientTicket,
  APIClientTicketMessage
} from './help.models'
import { toTicketMessageViewModel, toTicketViewModel } from './help.view-models'

describe('Help transport adapters', () => {
  const ticket: APIClientTicket = {
    id: 'ticket-1',
    publicId: 'T-1',
    subject: 'A question',
    status: 'Open',
    lastMessageAt: '2026-09-03T20:00:00.000Z',
    createdAt: '2026-09-03T19:00:00.000Z',
    updatedAt: '2026-09-03T20:00:00.000Z'
  }

  const message: APIClientTicketMessage = {
    id: 'message-1',
    publicId: 'M-1',
    ticketId: ticket.id,
    authorType: 'User',
    contentDelta: '[]',
    contentHtml: '<p>Hello</p>',
    createdAt: '2026-09-03T20:00:00.000Z'
  }

  it('keeps transport DTOs serializable and adds state only in the view model', () => {
    expect(JSON.parse(JSON.stringify(ticket))).toEqual(ticket)
    expect('triggerDisappear' in ticket).toBeFalse()
    expect('collapse' in ticket).toBeFalse()

    const viewModel = toTicketViewModel(ticket)

    expect(viewModel.id).toBe(ticket.id)
    expect(viewModel.triggerDisappear()).toBeFalse()
    expect(viewModel.collapse()).toBeFalse()
    expect(JSON.stringify(ticket)).not.toContain('triggerDisappear')
  })

  it('keeps message transport DTOs free of Angular runtime state', () => {
    expect(JSON.parse(JSON.stringify(message))).toEqual(message)
    expect('triggerDisappear' in message).toBeFalse()
    expect('collapse' in message).toBeFalse()

    const viewModel = toTicketMessageViewModel(message)

    expect(viewModel.triggerDisappear()).toBeFalse()
    expect(viewModel.collapse()).toBeFalse()
  })

  it('creates independent view state without mutating either transport object', () => {
    const first = toTicketViewModel(ticket)
    const second = toTicketViewModel({ ...ticket, id: 'ticket-2' })

    first.collapse.set(true)
    first.triggerDisappear.set(true)

    expect(first.collapse()).toBeTrue()
    expect(first.triggerDisappear()).toBeTrue()
    expect(second.collapse()).toBeFalse()
    expect(second.triggerDisappear()).toBeFalse()
    expect(JSON.parse(JSON.stringify(ticket))).toEqual(ticket)
  })
})
