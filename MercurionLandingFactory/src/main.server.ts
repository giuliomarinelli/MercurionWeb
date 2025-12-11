import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { Root } from './app/m-root';

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(Root, config, context);

export default bootstrap;
