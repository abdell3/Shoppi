import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../../../common/utils/password.util';

describe('InventoryModule (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let clientToken: string;
  let prisma: PrismaService;
  let categoryId: string;
  let productWithStockId: string;
  let productOutOfStockId: string;
  let productOutOfStockSku: string;

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

    await prisma.inventory.deleteMany({});
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

    // Create products for testing
    const productWithStock = await prisma.product.create({
      data: {
        name: 'Product With Stock',
        description: 'Product with stock available',
        price: 99.99,
        sku: 'SKU-WITH-STOCK',
        isHidden: false,
        categoryId: categoryId,
      },
    });
    productWithStockId = productWithStock.id;

    await prisma.inventory.create({
      data: {
        productId: productWithStockId,
        quantity: 10,
      },
    });

    const productOutOfStock = await prisma.product.create({
      data: {
        name: 'Product Out Of Stock',
        description: 'Product without stock',
        price: 199.99,
        sku: 'SKU-OUT-OF-STOCK',
        isHidden: false,
        categoryId: categoryId,
      },
    });
    productOutOfStockId = productOutOfStock.id;
    productOutOfStockSku = productOutOfStock.sku;

    await prisma.inventory.create({
      data: {
        productId: productOutOfStockId,
        quantity: 0,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.inventory.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.$disconnect();
    } catch (error) {
      console.warn('⚠️  Could not clean database:', error);
    }
    await app.close();
  });

  describe('GET /api/inventory/out-of-stock', () => {
    it('GET /api/inventory/out-of-stock → 401 sans token', async () => {
      const res = await request(server).get('/api/inventory/out-of-stock');
      expect(res.status).toBe(401);
    });

    it('GET /api/inventory/out-of-stock → 403 avec token CLIENT', async () => {
      const res = await request(server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/inventory/out-of-stock → 200 retourne les produits en rupture', async () => {
      const res = await request(server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThan(0);
      
      const outOfStockProduct = res.body.items.find(
        (item: any) => item.product.sku === productOutOfStockSku
      );
      expect(outOfStockProduct).toBeDefined();
      expect(outOfStockProduct.quantity).toBe(0);
      expect(outOfStockProduct.product).toHaveProperty('name');
      expect(outOfStockProduct.product).toHaveProperty('sku');
      expect(outOfStockProduct.product).toHaveProperty('price');
      expect(outOfStockProduct.product).toHaveProperty('category');
      expect(outOfStockProduct.product.category).toHaveProperty('name');
      expect(outOfStockProduct.product.category).toHaveProperty('slug');
    });

    it('GET /api/inventory/out-of-stock → 200 avec pagination (page=1, limit=1)', async () => {
      const res = await request(server)
        .get('/api/inventory/out-of-stock?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(1);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/inventory/out-of-stock → 200 avec pagination par défaut (page=1, limit=20)', async () => {
      const res = await request(server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(20);
    });

    it('GET /api/inventory/out-of-stock → 404 si aucun produit en rupture', async () => {
      // Delete all out of stock products
      await prisma.inventory.updateMany({
        where: { quantity: 0 },
        data: { quantity: 1 },
      });

      const res = await request(server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('No products out of stock');

      // Restore for other tests
      await prisma.inventory.update({
        where: { productId: productOutOfStockId },
        data: { quantity: 0 },
      });
    });

    it('GET /api/inventory/out-of-stock → 200 ne retourne que les produits avec quantity = 0', async () => {
      const res = await request(server)
        .get('/api/inventory/out-of-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.items.forEach((item: any) => {
        expect(item.quantity).toBe(0);
      });

      // Vérifier que le produit avec stock n'est pas dans la liste
      const productWithStockInList = res.body.items.find(
        (item: any) => item.product.id === productWithStockId
      );
      expect(productWithStockInList).toBeUndefined();
    });
  });
});
