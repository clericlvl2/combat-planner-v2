export const ERROR_REPORT_LIMITS = {
  message: 500,
  stack: 4000,
  path: 200,
  version: 32,
} as const;

const URL_TAIL = /((?:[a-z][a-z0-9+.-]*:\/\/|\/)[^\s?#'"`<>()]*)[?#][^\s'"`<>()]*/gi;

export const scrubSecrets = (text: string): string => text.replace(URL_TAIL, '$1');

export interface ErrorFields {
  message: string;
  stack?: string | null;
  path?: string | null;
  version?: string | null;
}

export interface ScrubbedErrorFields {
  message: string;
  stack: string | null;
  path: string | null;
  version: string | null;
}

const cut = (text: string, limit: number): string => text.slice(0, limit);

const optional = (
  text: string | null | undefined,
  limit: number,
  scrub: (text: string) => string,
): string | null => (text === undefined || text === null ? null : cut(scrub(text), limit));

const keep = (text: string): string => text;

export const scrubErrorFields = ({
  message,
  stack,
  path,
  version,
}: ErrorFields): ScrubbedErrorFields => ({
  message: cut(scrubSecrets(message), ERROR_REPORT_LIMITS.message),
  stack: optional(stack, ERROR_REPORT_LIMITS.stack, scrubSecrets),
  path: optional(path, ERROR_REPORT_LIMITS.path, scrubSecrets),
  version: optional(version, ERROR_REPORT_LIMITS.version, keep),
});
