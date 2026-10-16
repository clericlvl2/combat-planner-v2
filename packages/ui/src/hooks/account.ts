import type {
  AccountPatch,
  ApiClient,
  Session,
  SignInInput,
  SignUpInput,
} from '@combat-planner/api/client';
import { mutation } from './mutations.ts';
import type { MutationContext } from './mutations.ts';
import { queryKeys } from './queryKeys.ts';

export type SocialProvider = Parameters<ApiClient['auth']['socialSignIn']>[0];

export interface AccountActions {
  signIn: (input: SignInInput) => Promise<Session>;
  signUp: (input: SignUpInput) => Promise<Session>;
  socialSignIn: (provider: SocialProvider, callbackUrl: string) => Promise<{ url: string }>;
  signOut: () => Promise<void>;
  update: (patch: AccountPatch) => Promise<Session>;
  remove: () => Promise<void>;
}

export const getSession = (api: ApiClient): Promise<Session | null> => api.auth.session();

export const getProviders = (api: ApiClient): Promise<SocialProvider[]> => api.auth.providers();

export const SESSION_SCOPED_KEYS = [
  queryKeys.session,
  queryKeys.combats,
  queryKeys.presets,
  queryKeys.tags,
  queryKeys.settings,
] as const;

export function accountActions(api: ApiClient, context: MutationContext): AccountActions {
  const { t } = context;
  return {
    signIn: mutation(context, {
      send: (input: SignInInput) => api.auth.signIn(input),
      invalidate: SESSION_SCOPED_KEYS,
    }),
    signUp: mutation(context, {
      send: (input: SignUpInput) => api.auth.signUp(input),
      invalidate: SESSION_SCOPED_KEYS,
    }),
    socialSignIn: mutation(context, {
      send: (provider: SocialProvider, callbackUrl: string) =>
        api.auth.socialSignIn(provider, callbackUrl),
      invalidate: [],
    }),
    signOut: mutation(context, {
      send: () => api.auth.signOut(),
      invalidate: SESSION_SCOPED_KEYS,
    }),
    update: mutation(context, {
      send: (patch: AccountPatch) => api.account.update(patch),
      invalidate: [queryKeys.session],
    }),
    remove: mutation(context, {
      send: () => api.account.remove(),
      invalidate: SESSION_SCOPED_KEYS,
      success: () => ({ message: t('accountDeleted') }),
    }),
  };
}
