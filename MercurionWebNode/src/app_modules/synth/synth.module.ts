import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyntheticRouteEntity } from './Models/entities/synthetic-route.entity';
import { SyntheticStepMoleculeRef } from './Models/entities/synthetic-step-molecule-ref.entity';
import { SyntheticStepEntity } from './Models/entities/synthetic-step.entity';
import { SyntheticRouteService } from './services/synthetic-route.service';
import { SyntheticRouteResolver } from './resolvers/synthetic-route.resolver';
import { SyntheticStepService } from './services/synthetic-step.service';
import { SyntheticStepResolver } from './resolvers/synthetic-step.resolver';
import { SyntheticStepMoleculeRefService } from './services/synthetic-step-molecule-ref.service';
import { SyntheticStepMoleculeRefResolver } from './resolvers/synthetic-step-molecule-ref.resolver';
import { MoleculeCollectionModule } from '../molecule-collection/molecule-collection.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            SyntheticRouteEntity,
            SyntheticStepMoleculeRef,
            SyntheticStepEntity
        ]),
        MoleculeCollectionModule
    ],
    providers: [
        SyntheticRouteService,
        SyntheticRouteResolver,
        SyntheticStepService,
        SyntheticStepResolver,
        SyntheticStepMoleculeRefService,
        SyntheticStepMoleculeRefResolver
    ]
})
export class SynthModule { }
