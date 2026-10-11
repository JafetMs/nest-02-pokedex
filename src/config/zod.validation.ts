import { z } from 'zod';

export const ZodValidationSchema = z.object({
  MONGODB: z.string().min(1, 'MONGODB es obligatoria'),
  PORT: z.coerce.number().int().positive().default(3000),
  DEFAULT_LIMIT: z.coerce.number().int().positive().default(20),
});