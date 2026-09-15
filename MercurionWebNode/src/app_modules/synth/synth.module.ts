import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Synthesis } from './models/entities/synthesis.entity';
import { SynthStepItem } from './models/entities/synth-step-item.entity';
import { SynthStep } from './models/entities/synth-step.entity';
import { SynthesisService } from './services/synthesis.service';
import { SyntheticRouteResolver } from './resolvers/synthetic-route.resolver';
import { SyntheticStepService } from './services/synthetic-step.service';
import { SyntheticStepResolver } from './resolvers/synthetic-step.resolver';
import { SynthStepItemService } from './services/synth-step-item.service';
import { SynthStepItemResolver } from './resolvers/synth-step-item.resolver';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';
import { SynthesisPoolCollection } from './models/entities/synthesis-pool-collection.entity';
import { SynthesisPoolMolecule } from './models/entities/synthesis-pool-molecule.entity';
import { SynthesisPoolService } from './services/synthesis-pool.service';
import { SynthesisPoolResolver } from './resolvers/synthesis-pool.resolver';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Synthesis,
            SynthStepItem,
            SynthStep,
            SynthesisPoolCollection,
            SynthesisPoolMolecule
        ]),
        MoleculeCollectionModule
    ],
    providers: [
        SynthesisService,
        SyntheticRouteResolver,
        SyntheticStepService,
        SyntheticStepResolver,
        SynthStepItemService,
        SynthStepItemResolver,
        SynthesisPoolService,
        SynthesisPoolResolver
    ]
})
export class SynthModule { }
