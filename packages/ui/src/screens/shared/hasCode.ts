import { ApiError } from '@combat-planner/api/client';

export const hasCode = (error: unknown, code: ApiError['code']): boolean =>
  error instanceof ApiError && error.code === code;
