import { z } from 'zod';

export const usageBatchSchema = z.object({
  body: z.object({
    sessions: z.array(z.object({
      appId: z.string().min(1),
      start: z.number().int(),
      end: z.number().int(),
    })).min(1),
  }),
});