import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Synthesis } from './Models/entities/synthesis.entity';
import { SynthStepMoleculeRef } from './Models/entities/synth-step-molecule-ref.entity';
import { SynthStep } from './Models/entities/synth-step.entity';
import { SynthesisService } from './services/synthesis.service';
import { SyntheticRouteResolver } from './resolvers/synthetic-route.resolver';
import { SyntheticStepService } from './services/synthetic-step.service';
import { SyntheticStepResolver } from './resolvers/synthetic-step.resolver';
import { SynthStepMoleculeRefService } from './services/synth-step-molecule-ref.service';
import { SyntheticStepMoleculeRefResolver } from './resolvers/synthetic-step-molecule-ref.resolver';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Synthesis,
            SynthStepMoleculeRef,
            SynthStep
        ]),
        MoleculeCollectionModule
    ],
    providers: [
        SynthesisService,
        SyntheticRouteResolver,
        SyntheticStepService,
        SyntheticStepResolver,
        SynthStepMoleculeRefService,
        SyntheticStepMoleculeRefResolver
    ]
})
export class SynthModule { }
