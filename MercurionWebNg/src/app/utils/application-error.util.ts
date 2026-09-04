import {
  ApplicationErrorCode,
  type ApplicationErrorCodeType,
  isApplicationErrorCode } from '@mercurion/rest-contracts';

export { ApplicationErrorCode };

export class ApplicationClientError extends Error {
  constructor(public readonly code: ApplicationErrorCodeType) {
    super(code);
    this.name = 'ApplicationClientError';
  }
}

export function getApplicationErrorCode(
  value: unknown,
): ApplicationErrorCodeType | undefined {
  return findApplicationErrorCode(value, new Set<unknown>());
}

export function hasApplicationErrorCode(
  value: unknown,
  code: ApplicationErrorCodeType,
): boolean {
  return getApplicationErrorCode(value) === code;
}

function findApplicationErrorCode(
  value: unknown,
  visited: Set<unknown>,
): ApplicationErrorCodeType | undefined {
  if (isApplicationErrorCode(value)) {
    return value;
  }

  if (!value || typeof value !== 'object' || visited.has(value)) {
    return undefined;
  }
  visited.add(value);

  const candidate = value as Record<string, unknown>;
  if (isApplicationErrorCode(candidate['code'])) {
    return candidate['code'];
  }

  const nestedValues = [
    candidate['error'],
    candidate['extensions'],
    candidate['errors'],
    candidate['gqlErrors'],
    candidate['graphQLErrors'],
  ];

  for (const nested of nestedValues) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const code = findApplicationErrorCode(item, visited);
        if (code) {
          return code;
        }
      }
      continue;
    }

    const code = findApplicationErrorCode(nested, visited);
    if (code) {
      return code;
    }
  }

  return undefined;
}
