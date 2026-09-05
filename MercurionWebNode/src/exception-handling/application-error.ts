import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  ApplicationErrorCode,
  type ApplicationErrorCode as ApplicationErrorCodeType,
  type ApplicationErrorPayload,
  getApplicationErrorDefinition,
  isApplicationErrorPayload,
  resolveLegacyApplicationErrorCode,
} from '@mercurion/rest-contracts';

export { ApplicationErrorCode }

export function applicationError(
  code: ApplicationErrorCodeType,
  message?: string,
  details?: Readonly<Record<string, unknown>>,
): RpcException {
  const definition = getApplicationErrorDefinition(code);
  const resolvedMessage = message ?? definition.defaultMessage;

  if (!resolvedMessage) {
    throw new Error(`Application error ${code} requires an explicit message`);
  }

  const payload: ApplicationErrorPayload = {
    code,
    message: resolvedMessage,
    ...(details ? { details } : {}),
  };

  return new RpcException(payload);
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

  const message = getErrorMessage(error);
  if (!message) {
    return undefined;
  }

  const code = resolveLegacyApplicationErrorCode(message);
  return code ? { code, message } : undefined;
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

function getErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}
