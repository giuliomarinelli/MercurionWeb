import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chembl36Module } from './app_modules/chembl_36/chembl_36.module';
import { MeilisearchModule } from './app_modules/meilisearch/meilisearch.module';



@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      database: 'chembl_36',
      password: 'rootpassword',
      username: 'app',
      autoLoadEntities: true
    }),
    Chembl36Module,
    MeilisearchModule
  ],
  providers: [],
})
export class AppModule { }
