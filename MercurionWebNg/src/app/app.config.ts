import { SocketIoConfig } from './../../node_modules/ngx-socket-io/src/config/socket-io.config.d';
import { ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideSocketIo } from 'ngx-socket-io';
import { provideApollo } from 'apollo-angular';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations'
import { NgxSpinnerModule } from 'ngx-spinner';
import { AuthInterceptor } from './interceptors/auth-interceptor.interceptor';
import { QuillModule } from 'ngx-quill'

const config: SocketIoConfig = { url: 'http://localhost:8888', options: {} }

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideSocketIo(config),
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
      useValue: '/app'
    },
    provideAnimations(),
    importProvidersFrom(NgxSpinnerModule),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    importProvidersFrom(QuillModule.forRoot())
  ]
};
