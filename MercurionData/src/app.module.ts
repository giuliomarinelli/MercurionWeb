import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chembl36Module } from './app_modules/chembl_36/chembl_36.module';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5434,
      database: 'drugcentral',
      password: 'rootpassword',
      username: 'app',
      autoLoadEntities: true
    }),
    Chembl36Module
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
