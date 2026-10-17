import { SOCIAL_PROVIDERS } from '../client.ts';
import type { SignInMethod } from '../client.ts';

export interface AccountProvider {
  providerId: string;
  updatedAt: Date;
}

export const signInMethodOf = (accounts: readonly AccountProvider[]): SignInMethod => {
  const latest = accounts.reduce<AccountProvider | undefined>(
    (found, account) => (found && found.updatedAt >= account.updatedAt ? found : account),
    undefined,
  );
  return SOCIAL_PROVIDERS.find((provider) => provider === latest?.providerId) ?? 'email';
};
