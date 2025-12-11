import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { Root } from './app/m-root';


bootstrapApplication(Root, appConfig)
  .catch((err) => console.error(err))
