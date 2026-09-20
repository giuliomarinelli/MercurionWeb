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
  data?: T | null;
  errors?: ReadonlyArray<unknown> | null;
  // Apollo spesso ha anche 'loading', 'extensions', ecc. ma non ci interessa
};

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
  res: ApolloLike<T>,
  field: K,
  allowNull: boolean = false
): T[K] | null {
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

  const data = res.data;
  if (data == null || !(field in data)) {
    throw new GqlDataError("NoData");
  }

  const value = data[field];

  if (value == null && !allowNull) {
    throw new GqlDataError("NoData");
  }

  return value ?? null;
}
