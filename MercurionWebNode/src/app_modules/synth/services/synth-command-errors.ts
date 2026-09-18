import { ApplicationError, ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

export function throwSynthPersistenceError(error: unknown): never {
    if (error instanceof ApplicationError) {
        throw error
    }

    throw applicationError(
        ApplicationErrorCode.PERSISTENCE_FAILED,
        undefined,
        undefined,
        error,
    )
}
