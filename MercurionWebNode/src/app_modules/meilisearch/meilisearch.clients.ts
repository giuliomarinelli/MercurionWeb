import { FactoryProvider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Meilisearch } from 'meilisearch'

// Keep the existing token/key for search consumers and legacy deployments.
export const meilisearchClientProviders: FactoryProvider<Meilisearch>[] = [
  {
    provide: 'MEILISEARCH_CLIENT',
    useFactory: (config: ConfigService) => new Meilisearch({
      host: config.getOrThrow<string>('Meilisearch.host'),
      apiKey: config.getOrThrow<string>('Meilisearch.masterKey')
    }),
    inject: [ConfigService]
  },
  {
    provide: 'MEILISEARCH_LOG_CLIENT',
    useFactory: (config: ConfigService) => new Meilisearch({
      host: config.getOrThrow<string>('Meilisearch.host'),
      apiKey: config.getOrThrow<string>('Meilisearch.logKey')
    }),
    inject: [ConfigService]
  }
]
