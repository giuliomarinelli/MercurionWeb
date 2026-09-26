import { Kind, type ASTNode, type GraphQLScalarTypeConfig } from 'graphql'
import { GraphQLScalarType } from 'graphql'
import type { UUID } from 'crypto'
import {
  ApplicationErrorCode,
  applicationError,
  applicationHttpException,
} from 'src/exception-handling/application-error'
import { registerDecorator, type ValidationOptions } from 'class-validator'

declare const mercurionPublicIdBrand: unique symbol

export type MercurionPublicId = UUID & {
  readonly [mercurionPublicIdBrand]: 'MercurionPublicId'
}

const MERCURION_PUBLIC_ID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isMercurionPublicId(value: unknown): value is MercurionPublicId {
  return typeof value === 'string' && MERCURION_PUBLIC_ID_V7.test(value)
}

export function parseMercurionPublicId(
  value: unknown,
  field = 'id',
): MercurionPublicId {
  if (!isMercurionPublicId(value)) {
    throw applicationError(
      ApplicationErrorCode.PUBLIC_ID_INVALID,
      `Invalid Mercurion public ID for ${field}`,
      { field },
    )
  }
  return value
}

export function assertMercurionPublicId(
  value: unknown,
  field = 'id',
): asserts value is MercurionPublicId {
  parseMercurionPublicId(value, field)
}

export class MercurionPublicIdPipe {
  transform(value: unknown): MercurionPublicId {
    if (!isMercurionPublicId(value)) {
      throw applicationHttpException(
        ApplicationErrorCode.PUBLIC_ID_INVALID,
        undefined,
        { field: 'id' },
      )
    }
    return value
  }
}

export function IsMercurionPublicId(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isMercurionPublicId',
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: {
        validate: isMercurionPublicId,
        defaultMessage: () => 'must be a canonical Mercurion public ID',
      },
    })
  }
}

const scalarConfig: GraphQLScalarTypeConfig<MercurionPublicId, string> = {
  name: 'MercurionPublicId',
  description: 'A canonical Mercurion-generated UUIDv7 public identifier.',
  serialize: (value) => parseMercurionPublicId(value),
  parseValue: (value) => parseMercurionPublicId(value),
  parseLiteral: (node: ASTNode) => {
    if (node.kind !== Kind.STRING) {
      throw applicationError(
        ApplicationErrorCode.PUBLIC_ID_INVALID,
        'Invalid Mercurion public ID',
      )
    }
    return parseMercurionPublicId(node.value)
  },
}

export const MercurionPublicIdScalar = new GraphQLScalarType(scalarConfig)
