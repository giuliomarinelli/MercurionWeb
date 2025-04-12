import { SocketIoConfig } from './../../node_modules/ngx-socket-io/src/config/socket-io.config.d';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideSocketIo } from 'ngx-socket-io';


const config: SocketIoConfig = { url: 'http://localhost:8988', options: {} }

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideSocketIo(config)
  ]
};
