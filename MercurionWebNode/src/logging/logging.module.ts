import { Global, Module } from '@nestjs/common'
import { MeilisearchModule } from '../app_modules/meilisearch/meilisearch.module'
import { MeiliLoggerService } from '../app_modules/meilisearch/services/meili-logger.service'
import { LoggerPort } from './logger.port'

/**
 * Composition-root binding for the application logger. The adapter remains
 * replaceable while consumers depend only on LoggerPort.
 */
@Global()
@Module({
  imports: [MeilisearchModule],
  providers: [
    MeiliLoggerService,
    { provide: LoggerPort, useExisting: MeiliLoggerService },
  ],
  exports: [LoggerPort],
})
export class LoggingModule {}
