import { z } from 'zod';

export const healthSchema = z.object({ status: z.literal('ok') });

export type Health = z.infer<typeof healthSchema>;

export const tickSchema = z.object({ tick: z.number().int().nonnegative() });

export type Tick = z.infer<typeof tickSchema>;
