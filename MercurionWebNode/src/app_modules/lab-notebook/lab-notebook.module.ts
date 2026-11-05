import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LabNotebook } from './scientific-domain/entities/lab-notebook.entity'
import { NotebookSection } from './scientific-domain/entities/notebook-section.entity'
import { NotebookExperiment } from './scientific-domain/entities/notebook-experiment.entity'
import { ExperimentExecution } from './scientific-domain/entities/experiment-execution.entity'
import { ExperimentProtocolRevision } from './scientific-domain/entities/experiment-protocol-revision.entity'
import { NotebookDomainService } from './scientific-domain/notebook-domain.service'
import { ExperimentProtocolService } from './scientific-domain/experiment-protocol.service'
import {
  LabNotebookDomainResolver,
  NotebookSectionDomainResolver,
  NotebookExperimentDomainResolver,
  ExperimentExecutionDomainResolver,
  ExperimentProtocolRevisionDomainResolver
} from './scientific-domain/notebook-domain.resolver'

/**
 * DB-first scientific Notebook v1.
 * The legacy chapter/section/page GraphQL resolvers are intentionally not
 * registered: those tables no longer exist after PostgreSQL 16 cutover.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      LabNotebook,
      NotebookSection,
      NotebookExperiment,
      ExperimentExecution,
      ExperimentProtocolRevision
    ])
  ],
  providers: [
    NotebookDomainService,
    ExperimentProtocolService,
    LabNotebookDomainResolver,
    NotebookSectionDomainResolver,
    NotebookExperimentDomainResolver,
    ExperimentExecutionDomainResolver,
    ExperimentProtocolRevisionDomainResolver
  ]
})
export class LabNotebookModule {}
