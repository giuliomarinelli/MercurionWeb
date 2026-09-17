import { ApplicationConfig, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideApollo } from 'apollo-angular';
import { ApolloLink } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthFallbackInterceptor } from './interceptors/auth-fallback.interceptor';
import { CorrelationInterceptor } from './interceptors/correlation.interceptor';
import { MercurionTitleStrategy } from './mercurion-title-strategy';
import { CONTRACT_VERSION_HEADER, CURRENT_CONTRACT_MAJOR } from '@mercurion/rest-contracts';
import { GRAPHQL_QUERY_FETCH_POLICY } from './services/graphql/graphql-query-policy';
import { createMercurionApolloCache } from './services/graphql/apollo-cache-policies';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'disabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    provideHttpClient(withInterceptorsFromDi()),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const contractVersionLink = new ApolloLink((operation, forward) => {
        operation.setContext(({ headers = {} }) => ({
          headers: { ...headers, [CONTRACT_VERSION_HEADER]: String(CURRENT_CONTRACT_MAJOR) }
        }));
        return forward(operation);
      });
      return {
        link: contractVersionLink.concat(httpLink.create({ uri: '/api/graphql' })),
        cache: createMercurionApolloCache(),
        defaultOptions: {
          query: {
            fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.stableReference,
            errorPolicy: 'none'
          },
          watchQuery: {
            fetchPolicy: GRAPHQL_QUERY_FETCH_POLICY.ownedReactive,
            errorPolicy: 'none'
          }
        },
        uri: '/api/graphql'
      };
    }),
    {
      provide: APP_BASE_HREF,
      useValue: '/'
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthFallbackInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CorrelationInterceptor,
      multi: true
    },
    {
      provide: TitleStrategy,
      useClass: MercurionTitleStrategy
    }
  ]
};
