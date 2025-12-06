export interface HttpErrorBody {
  timestamp: string
  requestId: string
  path: string
  statusCode: number
  error: string
  message?: string
}
