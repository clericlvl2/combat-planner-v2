export const DOMAIN_ERROR_CODES = [
  'version',
  'forbidden',
  'blocked',
  'limit',
  'notFound',
  'invalid',
] as const;
export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
