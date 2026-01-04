import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let accessToken: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    try {
      console.log('🔄 Running Prisma migrations...');
      execSync('npx prisma migrate deploy', {
        cwd: resolve(__dirname, '../../../../'),
        env: { ...process.env },
        stdio: 'inherit',
      });
      console.log('✅ Prisma migrations applied');
    } catch (error) {
      console.error('❌ Failed to run Prisma migrations:', error);
      throw error;
    }

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    try {
      await prisma.$connect();
      console.log('✅ Database connected to:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
    } catch (error) {
      console.error('❌ Database connection failed');
      console.error('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
      console.error('Error:', error);
      throw new Error(`Cannot connect to test database at ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@')}. Make sure Docker PostgreSQL is running (docker-compose up -d postgres) and port 5433 is accessible.`);
    }

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    try {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      if (tables.some(t => t.tablename === 'User')) {
        await prisma.user.deleteMany({});
      }
      await prisma.$disconnect();
    } catch (error) {
      console.warn('⚠️  Could not clean database:', error);
    }
    await app.close();
  });

  it('POST /api/auth/register → 201', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).not.toHaveProperty('password');
  });

  it('POST /api/auth/login → 200 + JWT', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'testuser@test.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.accessToken.length).toBeGreaterThan(0);
    accessToken = res.body.accessToken;
  });

  it('GET /api/auth/my-profile → 401 sans token', async () => {
    const res = await request(server).get('/api/auth/my-profile');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/my-profile → 200 avec token', async () => {
    const res = await request(server)
      .get('/api/auth/my-profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', 'testuser@test.com');
  });
});