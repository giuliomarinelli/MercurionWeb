import { ApolloLike } from "./apollo-like.model";
import { GqlV2Error, GraphQLErrorLike } from "./gql-v2.error";

export function extractGqlDataV2<
  T extends Record<string, unknown>,
  K extends keyof T
>(res: ApolloLike<T>, field: K, allowNull?: false): NonNullable<T[K]>;

export function extractGqlDataV2<
  T extends Record<string, unknown>,
  K extends keyof T
>(res: ApolloLike<T>, field: K, allowNull: true): T[K] | null;

export function extractGqlDataV2<
  T extends Record<string, unknown>,
  K extends keyof T
>(
  res: ApolloLike<T>,
  field: K,
  allowNull: boolean = false
): any {
  if (res.errors?.length) {
    const gqlErrors = res.errors
      .filter((e): e is GraphQLErrorLike => typeof e === 'object' && e !== null)
      .map(e => e as GraphQLErrorLike);

    throw new GqlV2Error('GraphQL', gqlErrors, String(field))
  }

  const data = res.data as T | null | undefined
  const key = String(field)

  if (!data || !(key in data)) {
    throw new GqlV2Error('NoData', [], key)
  }

  const value = (data as any)[key];

  if ((value === null || value === undefined) && !allowNull) {
    throw new GqlV2Error('NoData', [], key)
  }

  return value ?? null
}

/**
 * Gestione errori nella callback error della subscription all'Observable
 *
 *
 *
 * import { GqlV2Error } from './extractGqlDataV2';

.subscribe({
  next: (v) => { ... },
  error: (e) => {
    if (e instanceof GqlV2Error && e.kind === 'GraphQL') {
      const firstMsg = e.gqlErrors[0]?.message;         // "Unauthenticated"
      const code = e.gqlErrors[0]?.extensions?.code;    // "UNAUTHENTICATED"
      const path = e.gqlErrors[0]?.path?.join('.');     // "existsUserTicketById"

      // logger.info(firstMsg, code, path);
      return;
    }

    throw e; // o gestione network ecc.
  }
});

 *
 *
 */

