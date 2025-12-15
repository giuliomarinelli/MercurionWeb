export interface GraphQLResponse<TData = unknown> {
  data?: TData;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  extensions?: Extensions;
}

export interface Extensions {
  code?: string;
}
