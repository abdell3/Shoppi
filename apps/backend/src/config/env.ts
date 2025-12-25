import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3003),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "Le JWT_SECRET doit faire au moins 16 caractères"),
});

export const env = envSchema.parse(process.env);