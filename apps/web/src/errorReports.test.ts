import { ApiError } from '@combat-planner/api/client';
import type { ErrorReport } from '@combat-planner/api/client';
import { describe, expect, it } from 'vite-plus/test';
import { MAX_REPORTS_PER_PAGE, createErrorReporter } from './errorReports.ts';

const setup = () => {
  const sent: ErrorReport[] = [];
  const target = new EventTarget();
  const reporter = createErrorReporter({
    send: (report) => sent.push(report),
    version: '1.2.3',
    path: () => '/combats/01J/play',
  });
  const stop = reporter.listen(target);
  const throwUncaught = (error: unknown) =>
    target.dispatchEvent(
      Object.assign(new Event('error'), {
        error,
        message: error instanceof Error ? error.message : '',
      }),
    );
  const rejectUnhandled = (reason: unknown) =>
    target.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }));
  return { sent, reporter, stop, throwUncaught, rejectUnhandled };
};

describe('error reporter', () => {
  it('reports an uncaught error and an unhandled rejection with path and version', () => {
    const { sent, throwUncaught, rejectUnhandled } = setup();
    const error = new TypeError('x is undefined');
    throwUncaught(error);
    rejectUnhandled('plain reason');
    expect(sent).toEqual([
      {
        message: 'x is undefined',
        stack: error.stack,
        path: '/combats/01J/play',
        version: '1.2.3',
      },
      { message: 'plain reason', path: '/combats/01J/play', version: '1.2.3' },
    ]);
  });

  it('skips an ApiError', () => {
    const { sent, throwUncaught, rejectUnhandled, reporter } = setup();
    rejectUnhandled(new ApiError({ status: 0, code: 'network' }));
    throwUncaught(new ApiError({ status: 429, code: 'rateLimited' }));
    reporter.report(new ApiError({ status: 401, code: 'unauthorized' }));
    expect(sent).toEqual([]);
  });

  it('reports the same message once per page load', () => {
    const { sent, throwUncaught, reporter } = setup();
    throwUncaught(new Error('boom'));
    throwUncaught(new Error('boom'));
    reporter.report(new Error('boom'));
    expect(sent.map((report) => report.message)).toEqual(['boom']);
  });

  it(`stops after ${MAX_REPORTS_PER_PAGE} reports`, () => {
    const { sent, throwUncaught } = setup();
    for (let index = 0; index < 8; index += 1) throwUncaught(new Error(`boom ${index}`));
    expect(MAX_REPORTS_PER_PAGE).toBe(5);
    expect(sent.map((report) => report.message)).toEqual([
      'boom 0',
      'boom 1',
      'boom 2',
      'boom 3',
      'boom 4',
    ]);
  });

  it('reports a route error response by its status and stops listening on cleanup', () => {
    const { sent, reporter, stop, throwUncaught } = setup();
    reporter.report({ status: 500, statusText: 'Internal Server Error', data: null });
    stop();
    throwUncaught(new Error('after stop'));
    expect(sent.map((report) => report.message)).toEqual(['500 Internal Server Error']);
  });
});
