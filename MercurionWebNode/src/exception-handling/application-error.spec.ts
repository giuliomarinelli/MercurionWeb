import {
  APPLICATION_ERROR_CATALOG,
  ApplicationErrorCode,
  getApplicationErrorDefinition,
  resolveLegacyApplicationErrorCode,
} from '@mercurion/rest-contracts';
import {
  applicationError,
  applicationHttpException,
  getApplicationError,
  getApplicationErrorMessage,
  isApplicationError,
} from './application-error';

describe('application error catalog', () => {
  it('provides complete transport policy for every code', () => {
    for (const code of Object.keys(
      APPLICATION_ERROR_CATALOG,
    ) as ApplicationErrorCode[]) {
      const definition = getApplicationErrorDefinition(code);
      const message = definition.defaultMessage ?? `Test message for ${code}`;
      const rpcError = applicationError(code, message);
      const httpError = applicationHttpException(code, message);

      expect(getApplicationError(rpcError)).toEqual({ code, message });
      expect(getApplicationError(httpError)).toMatchObject({ code, message });
      expect(httpError.getStatus()).toBe(definition.httpStatus);
      expect(getApplicationErrorMessage({ code, message }, false)).toBe(
        definition.publicMessage ?? message,
      );
      expect(getApplicationErrorMessage({ code, message }, true)).toBe(
        definition.exposeInProduction
          ? (definition.publicMessage ?? message)
          : 'Internal Server Error',
      );
    }
  });

  it('branches on stable codes instead of legacy messages', () => {
    const error = applicationError(ApplicationErrorCode.PERMISSION_DENIED);

    expect(
      isApplicationError(error, ApplicationErrorCode.PERMISSION_DENIED),
    ).toBe(true);
    expect(
      isApplicationError(error, ApplicationErrorCode.SESSION_INVALID),
    ).toBe(false);
  });

  it('preserves legacy status and public-message policies', () => {
    const rateLimited = applicationError(
      ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS,
    );

    expect(
      getApplicationErrorDefinition(
        ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS,
      ).httpStatus,
    ).toBe(429);
    expect(
      getApplicationErrorMessage(getApplicationError(rateLimited)!, false),
    ).toBe('Rate limit exceeded.');
    expect(
      getApplicationErrorDefinition(ApplicationErrorCode.SESSION_INVALID)
        .httpStatus,
    ).toBe(403);
  });

  it('does not guess when one legacy message had distinct transport meanings', () => {
    expect(resolveLegacyApplicationErrorCode('Unauthenticated')).toBeUndefined();
  });
});
