import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  ApplicationErrorCode,
  type ApplicationErrorCode as ApplicationErrorCodeType,
  type ApplicationErrorPayload,
  getApplicationErrorDefinition,
  isApplicationErrorPayload,
} from '@mercurion/rest-contracts';

export { ApplicationErrorCode }

export type ApplicationErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'infrastructure'
  | 'internal'

export class ApplicationError extends RpcException {
  readonly code: ApplicationErrorCodeType
  readonly category: ApplicationErrorCategory
  readonly httpStatus: number
  readonly exposeInProduction: boolean
  readonly cause?: unknown

  constructor(
    code: ApplicationErrorCodeType,
    message: string,
    details?: Readonly<Record<string, unknown>>,
    cause?: unknown,
  ) {
    const definition = getApplicationErrorDefinition(code)
    const payload: ApplicationErrorPayload = {
      code,
      message,
      ...(details ? { details } : {}),
    }
    super(payload)
    this.code = code
    this.category = categoryForStatus(definition.httpStatus)
    this.httpStatus = definition.httpStatus
    this.exposeInProduction = definition.exposeInProduction
    this.cause = cause
  }
}

export function applicationError(
  code: ApplicationErrorCodeType,
  message?: string,
  details?: Readonly<Record<string, unknown>>,
  cause?: unknown,
): ApplicationError {
  const definition = getApplicationErrorDefinition(code);
  const resolvedMessage = message ?? definition.defaultMessage;

  if (!resolvedMessage) {
    throw new Error(`Application error ${code} requires an explicit message`);
  }

  return new ApplicationError(code, resolvedMessage, details, cause)
}

export function applicationHttpException(
  code: ApplicationErrorCodeType,
  message?: string,
  details?: Readonly<Record<string, unknown>>,
): HttpException {
  const definition = getApplicationErrorDefinition(code);
  const resolvedMessage = message ?? definition.defaultMessage;

  if (!resolvedMessage) {
    throw new Error(`Application error ${code} requires an explicit message`);
  }

  const payload: ApplicationErrorPayload & { statusCode: number } = {
    statusCode: definition.httpStatus,
    code,
    message: resolvedMessage,
    ...(details ? { details } : {}),
  };

  return new HttpException(payload, definition.httpStatus);
}

export function getApplicationError(
  error: unknown,
): ApplicationErrorPayload | undefined {
  if (error instanceof RpcException) {
    const raw = error.getError();
    if (isApplicationErrorPayload(raw)) {
      return raw;
    }
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (isApplicationErrorPayload(response)) {
      return response;
    }
  }

  if (isApplicationErrorPayload(error)) {
    return error;
  }

  return undefined;
}

export function isApplicationError(
  error: unknown,
  code: ApplicationErrorCodeType,
): boolean {
  return getApplicationError(error)?.code === code;
}

export function getApplicationErrorMessage(
  payload: ApplicationErrorPayload,
  isProduction: boolean,
): string {
  const definition = getApplicationErrorDefinition(payload.code);
  if (isProduction && !definition.exposeInProduction) {
    return 'Internal Server Error';
  }
  return definition.publicMessage ?? payload.message;
}

function categoryForStatus(status: number): ApplicationErrorCategory {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'authentication'
  if (status === 403) return 'authorization'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 429) return 'rate-limit'
  if (status >= 500 && status < 600) return 'internal'
  return 'infrastructure'
}
