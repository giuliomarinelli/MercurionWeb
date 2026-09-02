import { instanceToPlain } from 'class-transformer'
import type { UUID } from 'node:crypto'
import type {
  Feedback as FeedbackContract,
  PhonePrefixDTO
} from '@mercurion/rest-contracts'
import { CountryService } from '../app_modules/auth/services/country.service'
import {
  FeedbackContextKind,
  FeedbackEnv,
  FeedbackKind,
  FeedbackSource,
  FeedbackStatus
} from '../app_modules/feedback/Models/enums/feedback.enums'
import { Feedback } from '../app_modules/feedback/Models/entities/feedback.entity'

describe('REST contract runtime parity', () => {
  it('maps country rows to the exact public phone-prefix shape', async () => {
    const find = jest.fn().mockResolvedValue([
      { id: 1, iso2: 'IT', phonecode: '39' },
      { id: 2, iso2: null, phonecode: '1' },
      { id: 3, iso2: 'GB', phonecode: null }
    ])
    const service = new CountryService({ find } as never)

    const result: PhonePrefixDTO[] = await service.getAllPhonePrefixes()

    expect(result).toEqual([{ id: 1, iso2: 'IT', phonecode: '+39' }])
    expect(find).toHaveBeenCalledWith({
      select: {
        id: true,
        iso2: true,
        phonecode: true
      }
    })
  })

  it('serializes feedback without Nest-only identity fields', () => {
    const wire: FeedbackContract = {
      id: '018f47f0-7b58-7c36-b7b2-f0c037bed6a4',
      createdAtMs: '1720000000000',
      env: 'staging',
      source: 'manual_page',
      kind: 'bug',
      ratingUtility: 4,
      ratingClarity: null,
      ratingExperience: 3,
      message: 'Example feedback',
      contextKind: 'navigation',
      contextRef: '/settings',
      contextMeta: { section: 'security' },
      clientVersion: '1.0.0',
      status: 'new',
      internalNote: null,
      tags: ['contract']
    }
    const entity = Object.assign(new Feedback(), wire, {
      id: wire.id as UUID,
      env: FeedbackEnv.STAGING,
      source: FeedbackSource.MANUAL_PAGE,
      kind: FeedbackKind.BUG,
      contextKind: FeedbackContextKind.NAVIGATION,
      status: FeedbackStatus.NEW,
      userId: '018f47f0-7b58-7c36-b7b2-f0c037bed6a5',
      anonAuthorKey: 'internal-only'
    })

    expect(instanceToPlain(entity)).toEqual(wire)
  })
})
