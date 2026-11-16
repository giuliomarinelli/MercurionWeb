import { Module } from '@nestjs/common';
import { AlphaModule } from './alpha.module';

@Module({ imports: [AlphaModule] })
export class BetaModule {}
