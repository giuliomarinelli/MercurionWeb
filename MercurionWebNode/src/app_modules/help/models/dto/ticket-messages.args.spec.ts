import { createGlobalValidationPipe } from 'src/config/validation-pipe'
import { TicketMessagesArgs } from './ticket-messages.args'

describe('TicketMessagesArgs', () => {
  const pipe = createGlobalValidationPipe()
  const metadata = { type: 'body' as const, metatype: TicketMessagesArgs, data: '' }

  it('accepts the ticket identifier alongside pagination arguments', async () => {
    await expect(pipe.transform({ ticketId: 'MTCK-000000079', page: 1, limit: 25 }, metadata))
      .resolves.toMatchObject({ ticketId: 'MTCK-000000079', page: 1, limit: 25 })
  })

  it('continues to reject unrelated arguments', async () => {
    await expect(pipe.transform({ ticketId: 'MTCK-000000079', page: 1, limit: 25, extra: true }, metadata))
      .rejects.toMatchObject({ status: 400 })
  })
})
