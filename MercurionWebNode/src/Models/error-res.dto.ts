import type { ErrorRes } from '@mercurion/rest-contracts'

export type InternalErrorRes = Pick<ErrorRes, 'statusCode' | 'error' | 'message'>
export type HttpErrorRes = ErrorRes