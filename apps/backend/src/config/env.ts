import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().optional(),
  BCRYPT_SALT_ROUND: z.coerce.number(),
});

export type EnvVars = z.infer<typeof envSchema>;

export function validateEnv() {
  return envSchema.parse(process.env);
}
