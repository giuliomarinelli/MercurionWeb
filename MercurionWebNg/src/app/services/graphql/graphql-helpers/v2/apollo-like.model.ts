import { Maybe } from 'graphql/jsutils/Maybe'

export type ApolloLike<T extends Record<string, unknown>> = {
  data?: Maybe<T> | null
  errors?: ReadonlyArray<unknown> | null
}
