import type { Preset } from '@combat-planner/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useApi } from '../api/ApiProvider.tsx';
import { listPresets, presetActions } from './presets.ts';
import type { PresetActions } from './presets.ts';
import { queryKeys } from './queryKeys.ts';
import { useToasts } from './useToasts.ts';

export interface Presets extends PresetActions {
  presets: Preset[] | undefined;
  status: 'pending' | 'error' | 'success';
  error: Error | null;
}

export function usePresets(): Presets {
  const api = useApi();
  const queryClient = useQueryClient();
  const { show, t } = useToasts();
  const query = useQuery({ queryKey: queryKeys.presets, queryFn: () => listPresets(api) });
  const actions = useMemo(
    () => presetActions(api, { queryClient, show, t }),
    [api, queryClient, show, t],
  );
  return { presets: query.data, status: query.status, error: query.error, ...actions };
}
