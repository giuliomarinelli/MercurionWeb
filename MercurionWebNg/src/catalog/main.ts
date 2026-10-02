import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { CatalogComponent } from './catalog.component';

bootstrapApplication(CatalogComponent, {
  providers: [
    provideRouter([]),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.dark' } } }),
  ],
}).catch(error => {
  // eslint-disable-next-line no-console
  console.error('Unable to start the Mercurion UI catalog', error);
});
