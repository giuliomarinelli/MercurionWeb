import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { ResponseModule } from 'src/services/response.module';

@Module({
  imports: [ResponseModule],
  controllers: [AdminController],
})
export class AdminModule { }
