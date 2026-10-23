import { ApiError } from '@combat-planner/api/client';
import type { ErrorReport } from '@combat-planner/api/client';

export const MAX_REPORTS_PER_PAGE = 5;

export interface ErrorReporterOptions {
  send: (report: ErrorReport) => void;
  version: string;
  path: () => string;
}

export interface ErrorTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

export interface ErrorReporter {
  report(error: unknown): void;
  listen(target: ErrorTarget): () => void;
}

const UNKNOWN = 'unknown error';

const describe = (error: unknown): { message: string; stack?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || UNKNOWN,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  if (typeof error === 'string') return { message: error || UNKNOWN };
  if (typeof error === 'object' && error !== null) {
    const { status, statusText } = error as { status?: unknown; statusText?: unknown };
    if (typeof status === 'number')
      return { message: `${status} ${typeof statusText === 'string' ? statusText : ''}`.trim() };
  }
  return { message: String(error) || UNKNOWN };
};

export function createErrorReporter({ send, version, path }: ErrorReporterOptions): ErrorReporter {
  const seen = new Set<string>();

  const report = (error: unknown): void => {
    if (error instanceof ApiError || seen.size >= MAX_REPORTS_PER_PAGE) return;
    const { message, stack } = describe(error);
    if (seen.has(message)) return;
    seen.add(message);
    send({ message, ...(stack === undefined ? {} : { stack }), path: path(), version });
  };

  const onError = (event: Event): void => {
    const { error, message } = event as Partial<ErrorEvent>;
    if (error === undefined && !message) return;
    report(error ?? message);
  };

  const onRejection = (event: Event): void => {
    report((event as PromiseRejectionEvent).reason);
  };

  return {
    report,
    listen: (target) => {
      target.addEventListener('error', onError);
      target.addEventListener('unhandledrejection', onRejection);
      return () => {
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
      };
    },
  };
}
