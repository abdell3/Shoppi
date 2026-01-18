import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../../../common/utils/password.util';

describe('UsersModule - Admin (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let clientToken: string;
  let prisma: PrismaService;
  let createdUserId: string;
  let adminUserId: string;
  let clientUserId: string;

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
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection failed');
      throw error;
    }

    await app.init();
    server = app.getHttpServer();

    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    const adminPassword = await hashPassword('AdminPass123!');
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: { password: adminPassword, role: UserRole.ADMIN, isActive: true },
      create: {
        firstName: 'Admin',
        lastName: 'Test',
        email: 'admin@test.com',
        password: adminPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    const clientPassword = await hashPassword('ClientPass123!');
    const clientUser = await prisma.user.upsert({
      where: { email: 'client@test.com' },
      update: { password: clientPassword, role: UserRole.CLIENT, isActive: true },
      create: {
        firstName: 'Client',
        lastName: 'Test',
        email: 'client@test.com',
        password: clientPassword,
        role: UserRole.CLIENT,
        isActive: true,
      },
    });
    clientUserId = clientUser.id;

    const adminLoginRes = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'AdminPass123!',
      });

    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.accessToken;

    const clientLoginRes = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'client@test.com',
        password: 'ClientPass123!',
      });

    expect(clientLoginRes.status).toBe(200);
    clientToken = clientLoginRes.body.accessToken;
  });

  afterAll(async () => {
    try {
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.$disconnect();
    } catch (error) {
      console.warn('⚠️  Could not clean database:', error);
    }
    await app.close();
  });

  describe('Sécurité - Guards', () => {
    it('GET /api/users → 401 sans token', async () => {
      const res = await request(server).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('GET /api/users → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/users → 200 avec token ADMIN', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/users (Admin only)', () => {
    it('POST /api/users → 401 sans token', async () => {
      const res = await request(server).post('/api/users').send({
        firstName: 'New',
        lastName: 'User',
        email: 'new@test.com',
        password: 'Password123!',
        role: 'CLIENT',
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/users → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
          password: 'Password123!',
          role: 'CLIENT',
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/users → 201 avec token ADMIN (créer CLIENT)', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
          password: 'Password123!',
          role: 'CLIENT',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'new@test.com');
      expect(res.body).toHaveProperty('role', 'CLIENT');
      expect(res.body).toHaveProperty('isActive', true);
      expect(res.body).not.toHaveProperty('password');
      createdUserId = res.body.id;
    });

    it('POST /api/users → 201 avec token ADMIN (créer ADMIN)', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'New',
          lastName: 'Admin',
          email: 'newadmin@test.com',
          password: 'Password123!',
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role', 'ADMIN');
    });

    it('POST /api/users → 409 si email existe déjà', async () => {
      // Ensure the user exists first
      await prisma.user.upsert({
        where: { email: 'new@test.com' },
        update: {},
        create: {
          firstName: 'New',
          lastName: 'User',
          email: 'new@test.com',
          password: await hashPassword('Password123!'),
          role: UserRole.CLIENT,
          isActive: true,
        },
      });

      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'new@test.com', // Already exists
          password: 'Password123!',
          role: 'CLIENT',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/users (Admin only)', () => {
    it('GET /api/users → 200 retourne la liste des utilisateurs', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('email');
      expect(res.body[0]).toHaveProperty('role');
      expect(res.body[0]).not.toHaveProperty('password');
    });
  });

  describe('GET /api/users/:id (Admin only)', () => {
    it('GET /api/users/:id → 404 si utilisateur inexistant', async () => {
      const res = await request(server)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('GET /api/users/:id → 200 retourne l\'utilisateur', async () => {
      const res = await request(server)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', createdUserId);
      expect(res.body).toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('PATCH /api/users/:id (Admin only)', () => {
    it('PATCH /api/users/:id → 404 si utilisateur inexistant', async () => {
      const res = await request(server)
        .patch('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('PATCH /api/users/:id → 200 met à jour l\'utilisateur', async () => {
      const res = await request(server)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'updated@test.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'updated@test.com');
    });

    it('PATCH /api/users/:id → 409 si email existe déjà', async () => {
      await request(server)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'updated@test.com' });

      const res = await request(server)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'client@test.com' }); 

      expect(res.status).toBe(409);
    });

    it('PATCH /api/users/:id → 200 peut changer le rôle', async () => {
      const res = await request(server)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role', 'ADMIN');
    });
  });

  describe('DELETE /api/users/:id (Admin only)', () => {
    it('DELETE /api/users/:id → 404 si utilisateur inexistant', async () => {
      const res = await request(server)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('DELETE /api/users/:id → 200 soft delete (isActive = false)', async () => {
      const deleteRes = await request(server)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body).toHaveProperty('isActive', false);

      const getRes = await request(server)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty('isActive', false);
    });

    it('DELETE /api/users/:id → 403 si tentative de supprimer son propre compte', async () => {
      const res = await request(server)
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Cannot delete your own account');
    });
  });
});
