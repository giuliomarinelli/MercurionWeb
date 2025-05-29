// src/graphql/plugins/token-header.plugin.ts
import {
  ApolloServerPlugin,
  GraphQLRequestContextWillSendResponse,
} from '@apollo/server';
import { FastifyRequest } from 'fastify';

type NestContext = {
  req: FastifyRequest & { __newAccessToken?: string };
  // non serve più `reply`
};

export const TokenHeaderPlugin: ApolloServerPlugin<NestContext> = {
  async requestDidStart() {
    return {
      async willSendResponse(
        requestContext: GraphQLRequestContextWillSendResponse<NestContext>,
      ) {
        const token = requestContext.contextValue.req.__newAccessToken;
        if (token && requestContext.response.http) {
          // API ufficiale Apollo 4 per manipolare gli header HTTP
          requestContext.response.http.headers.set('X-New-Access-Token', token);
        }
      },
    };
  },
};
