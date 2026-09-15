import { getApplicationError } from 'src/exception-handling/application-error'
import { Kind } from 'graphql'
import {
  assertMercurionPublicId,
  IsMercurionPublicId,
  MercurionPublicIdPipe,
  MercurionPublicIdScalar,
  isMercurionPublicId,
  parseMercurionPublicId,
} from './mercurion-public-id'

const validV7 = '018f0f5e-2b7c-7abc-8def-0123456789ab'
const validV7Uppercase = '018F0F5E-2B7C-7ABC-8DEF-0123456789AB'

describe('Mercurion public ID contract', () => {
  it.each([
    validV7,
    validV7Uppercase,
  ])('accepts canonical UUIDv7 values: %s', value => {
    expect(isMercurionPublicId(value)).toBe(true)
    expect(parseMercurionPublicId(value)).toBe(value)
  })

  it.each([
    '',
    ' ',
    ` ${validV7}`,
    `${validV7} `,
    '018f0f5e-2b7c-4abc-8def-0123456789ab',
    'not-a-uuid',
    null,
    42,
  ])('rejects malformed, wrong-version, or non-string values: %p', value => {
    expect(isMercurionPublicId(value)).toBe(false)
    expect(() => parseMercurionPublicId(value)).toThrow()
  })

  it('uses the same typed error for direct validation and the REST adapter', () => {
    try {
      assertMercurionPublicId('not-a-public-id', 'feedbackId')
      throw new Error('expected validation to fail')
    } catch (error) {
      expect(getApplicationError(error)?.code).toBe('PUBLIC_ID_INVALID')
    }

    try {
      new MercurionPublicIdPipe().transform('not-a-public-id')
      throw new Error('expected validation to fail')
    } catch (error) {
      expect(getApplicationError(error)?.code).toBe('PUBLIC_ID_INVALID')
    }
  })

  it('uses the canonical validator for GraphQL scalar values and literals', () => {
    expect(MercurionPublicIdScalar.parseValue(validV7)).toBe(validV7)
    expect(() => MercurionPublicIdScalar.parseValue('not-a-public-id')).toThrow()
    expect(
      MercurionPublicIdScalar.parseLiteral({
        kind: Kind.STRING,
        value: validV7,
      }),
    ).toBe(validV7)
  })

  it('exposes a class-validator decorator for GraphQL input DTOs', () => {
    class Input {
      @IsMercurionPublicId()
      id!: string
    }

    expect(Input).toBeDefined()
  })
})
