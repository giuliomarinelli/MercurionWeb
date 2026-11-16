import { STATUS_CODES } from 'node:http'

export function httpStatusDescription(status: number): string {
  return STATUS_CODES[status] ?? 'Internal Server Error'
}
