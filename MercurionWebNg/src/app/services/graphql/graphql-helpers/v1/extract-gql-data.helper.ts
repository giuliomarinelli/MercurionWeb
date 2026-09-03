import { Maybe } from "graphql/jsutils/Maybe";

type GraphQLErrorLike = { message?: string };

export class GqlDataError extends Error {
  constructor(
    public readonly kind: "GraphQL" | "NoData",
    message?: string
  ) {
    super(message ?? `GqlDataError::${kind}`);
    this.name = "GqlDataError";
  }
}

// forma super-larga che matcha ApolloQueryResult / MutationResult
export type ApolloLike<T extends Record<string, unknown>> = {
  data?: Maybe<T> | null;
  errors?: ReadonlyArray<unknown> | null;
  // Apollo spesso ha anche 'loading', 'extensions', ecc. ma non ci interessa
};

// --------------------
// 1) LEGACY overload (DEFAULT)
// se NON passi generics, questa è la prima che matcha e quindi torna any
export function extractGqlData(
  res: { data?: any; errors?: ReadonlyArray<unknown> | null },
  field: string,
  allowNull?: boolean
): any;

// --------------------
// 2) Typed overloads (nuovo mondo)

// default -> NON nullable
export function extractGqlData<
  T extends Record<string, unknown>,
  K extends keyof T
>(
  res: ApolloLike<T>,
  field: K,
  allowNull?: false
): NonNullable<T[K]>;

// allowNull true -> nullable
export function extractGqlData<
  T extends Record<string, unknown>,
  K extends keyof T
>(
  res: ApolloLike<T>,
  field: K,
  allowNull: true
): T[K] | null;

// --------------------
// impl unica
export function extractGqlData<
  T extends Record<string, unknown>,
  K extends keyof T
>(
  res: { data?: Maybe<T> | null; errors?: ReadonlyArray<unknown> | null },
  field: K | string,
  allowNull: boolean = false
): any {
  if (res.errors && res.errors.length > 0) {
    const messages = res.errors
      .map((e): string => {
        if (typeof e === "object" && e !== null && "message" in e) {
          const m = (e as GraphQLErrorLike).message;
          return typeof m === "string" ? m : "Unknown error";
        }
        return "Unknown error";
      })
      .join(", ");
    throw new GqlDataError("GraphQL", messages);
  }

  const data = res.data as any;
  const keyStr = String(field);

  if (data == null || !(keyStr in data)) {
    throw new GqlDataError("NoData");
  }

  const value = (data as Record<string, unknown>)[keyStr];

  if (value == null && !allowNull) {
    throw new GqlDataError("NoData");
  }

  return value ?? null;
}
