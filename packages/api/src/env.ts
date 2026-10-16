import { z } from 'zod';

export const oauthProviderSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});
export type OauthProvider = z.infer<typeof oauthProviderSchema>;

export const apiEnvSchema = z.object({
  betterAuthSecret: z.string().min(1),
  betterAuthUrl: z.url(),
  linkSecret: z.string().min(1),
  google: oauthProviderSchema.optional(),
  github: oauthProviderSchema.optional(),
});
export type ApiEnv = z.infer<typeof apiEnvSchema>;
