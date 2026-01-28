import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../../../common/utils/password.util';

describe('CatalogModule - Admin (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let clientToken: string;
  let prisma: PrismaService;
  let categoryId: string;
  let productId: string;

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

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

    const category = await prisma.category.upsert({
      where: { slug: 'electronics' },
      update: { isHidden: false },
      create: {
        name: 'Electronics',
        slug: 'electronics',
        isHidden: false,
      },
    });
    categoryId = category.id;

    const adminLoginRes = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'AdminPass123!',
      });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body.accessToken) {
      throw new Error(`Admin login failed: ${adminLoginRes.status} - ${JSON.stringify(adminLoginRes.body)}`);
    }
    adminToken = adminLoginRes.body.accessToken;

    const clientLoginRes = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'client@test.com',
        password: 'ClientPass123!',
      });

    if (clientLoginRes.status !== 200 || !clientLoginRes.body.accessToken) {
      throw new Error(`Client login failed: ${clientLoginRes.status} - ${JSON.stringify(clientLoginRes.body)}`);
    }
    clientToken = clientLoginRes.body.accessToken;

    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        sku: `TEST-PRODUCT-${Date.now()}`,
        isHidden: false,
        categoryId: categoryId,
      },
    });
    productId = testProduct.id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.product.deleteMany({});
        await prisma.category.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.$disconnect();
      }
    } catch (error) {
      console.warn('⚠️  Could not clean database:', error);
    }
    if (app) await app.close();
  });

  beforeEach(async () => {
    if (productId) {
      await prisma.product.update({
        where: { id: productId },
        data: { isHidden: false, name: 'Test Product' },
      });
    }
  });

  describe('Products - Sécurité', () => {
    it('POST /api/catalog/products → 401 sans token', async () => {
      const res = await request(server).post('/api/catalog/products').send({
        name: 'Test Product',
        description: 'Test Description',
        price: 99.99,
        categoryId: categoryId,
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/catalog/products → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .post('/api/catalog/products')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          categoryId: categoryId,
        });
      expect(res.status).toBe(403);
    });

    it('POST /api/catalog/products → 200 avec token ADMIN', async () => {
      const uniqueName = `Test Product ${Date.now()}`;
      const res = await request(server)
        .post('/api/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName,
          description: 'Test Description',
          price: 99.99,
          categoryId: categoryId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', uniqueName);
      expect(res.body).toHaveProperty('price', 99.99);
      expect(res.body).toHaveProperty('isActive', true);

      await prisma.product.delete({ where: { id: res.body.id } });
    });
  });

  describe('POST /api/catalog/products (Admin only)', () => {
    it('POST /api/catalog/products → 404 si catégorie inexistante', async () => {
      const res = await request(server)
        .post('/api/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product',
          description: 'Test Description',
          price: 99.99,
          categoryId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Category');
    });

    it('POST /api/catalog/products → 400 si données invalides', async () => {
      const res = await request(server)
        .post('/api/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          price: -10,
          categoryId: categoryId,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/catalog/products/admin (Admin only)', () => {
    let testProductIds: string[] = [];

    afterEach(async () => {
      if (testProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
        testProductIds = [];
      }
    });

    it('GET /api/catalog/products/admin → 401 sans token', async () => {
      const res = await request(server).get('/api/catalog/products/admin');
      expect(res.status).toBe(401);
    });

    it('GET /api/catalog/products/admin → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .get('/api/catalog/products/admin')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/catalog/products/admin → 200 retourne tous les produits (y compris isHidden)', async () => {
      const category = await prisma.category.upsert({
        where: { slug: 'electronics' },
        update: {},
        create: {
          name: 'Electronics',
          slug: 'electronics',
          isHidden: false,
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Hidden Product Admin',
          description: 'Hidden',
          price: 199.99,
          sku: `HIDDEN-ADMIN-${Date.now()}`,
          isHidden: true,
          categoryId: category.id,
        },
      });
      testProductIds.push(product.id);

      const res = await request(server)
        .get('/api/catalog/products/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      const hiddenProduct = res.body.find((p: any) => p.id === product.id);
      expect(hiddenProduct).toBeDefined();
      expect(hiddenProduct.isActive).toBe(false);
    });
  });

  describe('GET /api/catalog/products/:id (Admin only)', () => {
    beforeEach(async () => {
      if (productId) {
        await prisma.product.update({
          where: { id: productId },
          data: { isHidden: false },
        });
      }
    });

    it('GET /api/catalog/products/:id → 404 si produit inexistant', async () => {
      const res = await request(server)
        .get('/api/catalog/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('GET /api/catalog/products/:id → 200 retourne le produit', async () => {
      const res = await request(server)
        .get(`/api/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', productId);
      expect(res.body).toHaveProperty('name');
    });
  });

  describe('PATCH /api/catalog/products/:id (Admin only)', () => {
    beforeEach(async () => {
      if (productId) {
        await prisma.product.update({
          where: { id: productId },
          data: { isHidden: false, name: 'Test Product' },
        });
      }
    });

    afterEach(async () => {
      if (productId) {
        await prisma.product.update({
          where: { id: productId },
          data: { isHidden: false, name: 'Test Product' },
        });
      }
    });

    it('PATCH /api/catalog/products/:id → 404 si produit inexistant', async () => {
      const res = await request(server)
        .patch('/api/catalog/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });

    it('PATCH /api/catalog/products/:id → 200 met à jour le produit', async () => {
      const res = await request(server)
        .patch(`/api/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Product Name' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Updated Product Name');
    });

    it('PATCH /api/catalog/products/:id → 200 peut masquer le produit (isHidden)', async () => {
      const res = await request(server)
        .patch(`/api/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isHidden: true });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isActive', false);
    });

    it('PATCH /api/catalog/products/:id → 404 si catégorie inexistante', async () => {
      const res = await request(server)
        .patch(`/api/catalog/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categoryId: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/catalog/products/:id (Admin only)', () => {
    let testProductIds: string[] = [];

    afterEach(async () => {
      if (testProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
        testProductIds = [];
      }
    });

    it('DELETE /api/catalog/products/:id → 404 si produit inexistant', async () => {
      const res = await request(server)
        .delete('/api/catalog/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('DELETE /api/catalog/products/:id → 200 soft delete (isHidden = true)', async () => {
      const category = await prisma.category.upsert({
        where: { slug: 'electronics' },
        update: {},
        create: {
          name: 'Electronics',
          slug: 'electronics',
          isHidden: false,
        },
      });

      const product = await prisma.product.create({
        data: {
          name: 'Product To Delete',
          description: 'Will be deleted',
          price: 50.99,
          sku: `DELETE-${Date.now()}`,
          isHidden: false,
          categoryId: category.id,
        },
      });
      testProductIds.push(product.id);

      const res = await request(server)
        .delete(`/api/catalog/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isActive', false);

      const getRes = await request(server)
        .get(`/api/catalog/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty('isActive', false);
    });
  });

  describe('Categories - Sécurité', () => {
    it('POST /api/catalog/categories → 401 sans token', async () => {
      const res = await request(server).post('/api/catalog/categories').send({
        name: 'New Category',
        slug: 'new-category',
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/catalog/categories → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .post('/api/catalog/categories')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'New Category',
          slug: 'new-category',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/catalog/categories (Admin only)', () => {
    let testCategoryIds: string[] = [];

    afterEach(async () => {
      if (testCategoryIds.length > 0) {
        await prisma.category.deleteMany({ where: { id: { in: testCategoryIds } } });
        testCategoryIds = [];
      }
    });

    it('POST /api/catalog/categories → 201 crée une catégorie', async () => {
      const uniqueSlug = `new-category-${Date.now()}`;
      const res = await request(server)
        .post('/api/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Category',
          slug: uniqueSlug,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'New Category');
      expect(res.body).toHaveProperty('slug', uniqueSlug);
      expect(res.body).toHaveProperty('isActive', true);
      
      if (res.body.id) {
        testCategoryIds.push(res.body.id);
      }
    });

    it('POST /api/catalog/categories → 409 si slug existe déjà', async () => {
      await prisma.category.upsert({
        where: { slug: 'electronics' },
        update: {},
        create: {
          name: 'Electronics',
          slug: 'electronics',
          isHidden: false,
        },
      });

      const res = await request(server)
        .post('/api/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate',
          slug: 'electronics', 
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/catalog/categories/admin (Admin only)', () => {
    let testCategoryId: string;

    afterEach(async () => {
      if (testCategoryId) {
        await prisma.category.deleteMany({ where: { id: testCategoryId } });
        testCategoryId = '';
      }
    });

    it('GET /api/catalog/categories/admin → 200 retourne toutes les catégories (y compris isHidden)', async () => {
      const uniqueSlug = `hidden-category-admin-${Date.now()}`;
      const category = await prisma.category.create({
        data: {
          name: 'Hidden Category Admin',
          slug: uniqueSlug,
          isHidden: true,
        },
      });
      testCategoryId = category.id;

      const res = await request(server)
        .get('/api/catalog/categories/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      const hiddenCategory = res.body.find(
        (c: any) => c.id === testCategoryId
      );
      expect(hiddenCategory).toBeDefined();
      expect(hiddenCategory.isActive).toBe(false);
    });
  });

  describe('DELETE /api/catalog/categories/:id (Admin only)', () => {
    let testCategoryId: string;

    afterEach(async () => {
      if (testCategoryId) {
        await prisma.category.deleteMany({ where: { id: testCategoryId } });
        testCategoryId = '';
      }
    });

    it('DELETE /api/catalog/categories/:id → 200 soft delete (isHidden = true)', async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Category To Delete',
          slug: `category-to-delete-${Date.now()}`,
          isHidden: false,
        },
      });
      testCategoryId = category.id;

      const res = await request(server)
        .delete(`/api/catalog/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('isActive', false);

      const getRes = await request(server)
        .get(`/api/catalog/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveProperty('isActive', false);
    });
  });
});
