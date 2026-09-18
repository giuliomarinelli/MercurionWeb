import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CatalogComponent } from './catalog.component';

bootstrapApplication(CatalogComponent, {
  providers: [provideRouter([])],
}).catch(error => {
  // eslint-disable-next-line no-console
  console.error('Unable to start the Mercurion UI catalog', error);
});
