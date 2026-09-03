import type { ErrorRes } from '@mercurion/rest-contracts'

export type InternalErrorRes = Pick<ErrorRes, 'statusCode' | 'error' | 'code' | 'message'>
export type HttpErrorRes = ErrorRes