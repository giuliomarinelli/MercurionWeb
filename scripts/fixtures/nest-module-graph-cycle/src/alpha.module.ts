import { Module } from '@nestjs/common';
import { BetaModule } from './beta.module';

@Module({ imports: [BetaModule] })
export class AlphaModule {}
