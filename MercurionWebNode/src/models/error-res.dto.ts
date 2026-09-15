import type { ErrorRes } from '@mercurion/rest-contracts'

export interface InternalErrorRes {
  statusCode: number
  error: string
  code?: ErrorRes['code']
  message?: string
  details?: ErrorRes['details']
}
export type HttpErrorRes = ErrorRes