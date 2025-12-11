import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { Root } from './app/m-root';
import { config } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(Root, config, context);

export default bootstrap;
