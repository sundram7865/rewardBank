import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    childId: z.string().min(1),   
    title: z.string().min(1).max(200),
    rewardMinutes: z.number().int().positive(),
  }),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid(),      
  }),
});