import { ApplicationErrorCode } from '@mercurion/rest-contracts';
import {
  ApplicationClientError,
  getApplicationErrorCode,
  hasApplicationErrorCode,
} from './application-error.util';

describe('application error utilities', () => {
  it('extracts the canonical code from REST, GraphQL, and WebSocket shapes', () => {
    expect(
      getApplicationErrorCode({
        code: ApplicationErrorCode.PERMISSION_DENIED,
      }),
    ).toBe(ApplicationErrorCode.PERMISSION_DENIED);

    expect(
      getApplicationErrorCode({
        errors: [
          {
            extensions: {
              code: ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL,
            },
          },
        ],
      }),
    ).toBe(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED_FATAL);

    expect(
      getApplicationErrorCode({
        detail: 'legacy text',
        code: ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED,
      }),
    ).toBe(ApplicationErrorCode.AUTHENTICATION_UNAUTHORIZED);
  });

  it('supports client-originated application failures without message branching', () => {
    const error = new ApplicationClientError(
      ApplicationErrorCode.MOLECULE_NOT_FOUND,
    );

    expect(
      hasApplicationErrorCode(error, ApplicationErrorCode.MOLECULE_NOT_FOUND),
    ).toBe(true);
  });
});
