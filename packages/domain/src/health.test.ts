import { describe, expect, it } from 'vite-plus/test';
import { healthSchema, tickSchema } from './health.ts';

describe('healthSchema', () => {
  it('accepts an ok status', () => {
    expect(healthSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('rejects any other status', () => {
    expect(healthSchema.safeParse({ status: 'down' }).success).toBe(false);
  });
});

describe('tickSchema', () => {
  it('rejects a negative tick', () => {
    expect(tickSchema.safeParse({ tick: -1 }).success).toBe(false);
  });
});
