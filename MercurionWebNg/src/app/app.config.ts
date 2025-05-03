import { SocketIoConfig } from './../../node_modules/ngx-socket-io/src/config/socket-io.config.d';
import { ApplicationConfig, importProvidersFrom, inject, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideSocketIo } from 'ngx-socket-io';
import { provideApollo, APOLLO_OPTIONS } from 'apollo-angular';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { provideHttpClient } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations'
import { NgxSpinnerModule } from 'ngx-spinner';

const config: SocketIoConfig = { url: 'http://localhost:8888', options: {} }

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideSocketIo(config),
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      return {
        link: httpLink.create({ uri: '/graphql' }),
        cache: new InMemoryCache(),
      };
    }),
    {
      provide: APP_BASE_HREF,
      useValue: '/app'
    },
    provideAnimations(),
    importProvidersFrom(NgxSpinnerModule)
  ]
};
