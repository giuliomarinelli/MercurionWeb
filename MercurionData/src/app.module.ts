import { TranslationModule } from './app_modules/translation/translation.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chembl36Module } from './app_modules/chembl_36/chembl_36.module';
import { MeilisearchModule } from './app_modules/meilisearch/meilisearch.module';
import { EmbeddingsModule } from './app_modules/embeddings/embeddings.module';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { ReleaseVersionModule } from './app_modules/release-version/release-version.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env')
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      database: 'chembl_36',
      password: 'rootpassword',
      username: 'app',
      autoLoadEntities: true,
      synchronize: false
    }),
    TypeOrmModule.forRoot({
      name: 'MercurionConn',
      type: 'postgres',
      host: 'localhost',
      port: 5431,
      database: 'mercurion',
      password: 'rootpassword',
      username: 'app',
      autoLoadEntities: true,
      synchronize: false
    }),
    Chembl36Module,
    MeilisearchModule,
    EmbeddingsModule,
    TranslationModule,
    ReleaseVersionModule
  ],
  providers: [],
})
export class AppModule { }
