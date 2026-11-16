export type ApolloLike<T extends Record<string, unknown>> = {
  data?: T | null
  errors?: ReadonlyArray<unknown> | null
}
