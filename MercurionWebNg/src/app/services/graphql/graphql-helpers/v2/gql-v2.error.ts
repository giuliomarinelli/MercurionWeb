export type GraphQLErrorLike = {
  message?: string;
  path?: Array<string | number>;
  extensions?: { code?: string; [k: string]: unknown };
  [k: string]: unknown;
};

export class GqlV2Error extends Error {
  constructor(
    public readonly kind: 'GraphQL' | 'NoData',
    public readonly gqlErrors: ReadonlyArray<GraphQLErrorLike> = [],
    public readonly field?: string,
  ) {
    super(kind === 'GraphQL'
      ? `GqlV2Error::GraphQL${field ? `::${field}` : ''}`
      : `GqlV2Error::NoData${field ? `::${field}` : ''}`
    )
    this.name = 'GqlV2Error'
  }
}
