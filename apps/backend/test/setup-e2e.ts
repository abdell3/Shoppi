import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envTestPath = resolve(__dirname, '../.env');
dotenv.config({ path: envTestPath, override: false });

const dockerDbUrl = 'postgresql://admin:admin_pass@postgres:5432/shoppi_db?schema=public';
process.env.DATABASE_URL = dockerDbUrl;

if (process.env.DATABASE_URL?.includes('@postgres:')) {
  console.warn('⚠️  DATABASE_URL contains Docker service name "postgres". Replacing with localhost:5432');
  process.env.DATABASE_URL = dockerDbUrl;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-characters-long';
}

if (!process.env.BCRYPT_SALT_ROUND) {
  process.env.BCRYPT_SALT_ROUND = '10';
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}   