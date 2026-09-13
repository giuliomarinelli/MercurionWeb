import { HttpExceptionFilter } from '../../exception-handling/http-exception-filter'
import { createGlobalValidationPipe } from '../../config/validation-pipe'
import type { BootstrapDependencies } from '../bootstrap.types'
import { Environment } from '../../config/config.schema'

export function configureValidation(
  dependencies: Pick<BootstrapDependencies, 'app' | 'loggerFactory' | 'env'>
): void {
  dependencies.app.useGlobalFilters(new HttpExceptionFilter(
    dependencies.loggerFactory,
    dependencies.env !== Environment.Development
  ))
  dependencies.app.useGlobalPipes(createGlobalValidationPipe())
}
