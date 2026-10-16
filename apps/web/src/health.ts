import { healthSchema, type Health } from '@combat-planner/domain';

export async function fetchHealth(fetchFn: typeof fetch): Promise<Health> {
  const response = await fetchFn('/api/health');
  if (!response.ok) throw new Error(`GET /api/health answered ${response.status}`);
  return healthSchema.parse(await response.json());
}
