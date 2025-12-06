import { registerEnumType } from "@nestjs/graphql";

export enum AuthorType {
  User = 'User',
  Support = 'Support'
}

registerEnumType(AuthorType, { name: 'AuthorType' })