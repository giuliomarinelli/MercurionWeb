import { IsInt, IsString } from 'class-validator'
import { createGlobalValidationPipe } from './validation-pipe'

class ValidationFixture {
  @IsString()
  name!: string

  @IsInt()
  count!: number
}

describe('createGlobalValidationPipe', () => {
  it('accepts valid transformed input and rejects unknown fields', async () => {
    const pipe = createGlobalValidationPipe()
    await expect(pipe.transform({ name: 'sample', count: '2' }, {
      type: 'body',
      metatype: ValidationFixture,
      data: ''
    })).resolves.toMatchObject({ name: 'sample', count: 2 })

    await expect(pipe.transform({ name: 'sample', count: 2, extra: true }, {
      type: 'body',
      metatype: ValidationFixture,
      data: ''
    })).rejects.toMatchObject({ status: 400 })
  })

  it('rejects missing required fields and incompatible types', async () => {
    const pipe = createGlobalValidationPipe()
    await expect(pipe.transform({ name: 'sample' }, {
      type: 'body',
      metatype: ValidationFixture,
      data: ''
    })).rejects.toMatchObject({ status: 400 })
    await expect(pipe.transform({ name: 'sample', count: 'not-a-number' }, {
      type: 'body',
      metatype: ValidationFixture,
      data: ''
    })).rejects.toMatchObject({ status: 400 })
  })
})
