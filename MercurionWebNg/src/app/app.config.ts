import { ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideApollo } from 'apollo-angular';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations'
import { NgxSpinnerModule } from 'ngx-spinner';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthFallbackInterceptor } from './interceptors/auth-fallback.interceptor';
import { MercurionTitleStrategy } from './mercurion-title-strategy';


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
      return {
        link: httpLink.create({ uri: '/api/graphql' }),
        cache: new InMemoryCache(),
        uri: '/api/graphql'
      };
    }),
    {
      provide: APP_BASE_HREF,
      useValue: '/'
    },
    provideAnimations(), // @angular/animations è deprecato dalla v20.2, pacchetto legacy che verrà ritirato a novembre 2026 => usare enter/leave + CSS come nuova alternativa
    importProvidersFrom(NgxSpinnerModule),
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
      provide: TitleStrategy,
      useClass: MercurionTitleStrategy
    }
  ]
};
