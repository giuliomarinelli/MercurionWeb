import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chembl36Controller } from './controllers/chembl_36.controller';


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
    })
  ],
  controllers: [Chembl36Controller],
  providers: [],
})
export class AppModule { }
