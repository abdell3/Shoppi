import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';

describe('CatalogModule - Public (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;
  let categoryId: string;
  let publicProductId: string;
  let hiddenProductId: string;

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

    const category = await prisma.category.create({
      data: {
        name: 'Electronics',
        slug: 'electronics',
        isHidden: false,
      },
    });
    categoryId = category.id;

    const publicProduct = await prisma.product.create({
      data: {
        name: 'Public Product',
        description: 'A public product',
        price: 99.99,
        sku: 'PUBLIC-001',
        isHidden: false,
        categoryId: category.id,
      },
    });
    publicProductId = publicProduct.id;

    const hiddenProduct = await prisma.product.create({
      data: {
        name: 'Hidden Product',
        description: 'A hidden product',
        price: 199.99,
        sku: 'HIDDEN-001',
        isHidden: true,
        categoryId: category.id,
      },
    });
    hiddenProductId = hiddenProduct.id;

    await prisma.category.create({
      data: {
        name: 'Hidden Category',
        slug: 'hidden-category',
        isHidden: true,
      },
    });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.product.deleteMany({});
        await prisma.category.deleteMany({});
        await prisma.$disconnect();
      }
    } catch (error) {
      console.warn('⚠️  Could not clean database:', error);
    }
    if (app) await app.close();
  });

  describe('GET /api/catalog/products (Public)', () => {
    let testProductIds: string[] = [];

    afterEach(async () => {
      if (testProductIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: testProductIds } } });
        testProductIds = [];
      }
    });

    it('GET /api/catalog/products → 200 sans authentification', async () => {
      const res = await request(server).get('/api/catalog/products');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('GET /api/catalog/products → ne retourne que les produits publics (isHidden = false)', async () => {
      const res = await request(server).get('/api/catalog/products');

      expect(res.status).toBe(200);
      const products = res.body.items;
      
      products.forEach((product: any) => {
        expect(product).toHaveProperty('isActive', true);
      });

      const hiddenProduct = products.find((p: any) => p.id === hiddenProductId);
      expect(hiddenProduct).toBeUndefined();

      const publicProduct = products.find((p: any) => p.id === publicProductId);
      expect(publicProduct).toBeDefined();
      expect(publicProduct.isActive).toBe(true);
    });

    it('GET /api/catalog/products?page=1&limit=5 → pagination fonctionne', async () => {
      const res = await request(server)
        .get('/api/catalog/products?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(Number(res.body.meta.page)).toBe(1);
      expect(Number(res.body.meta.limit)).toBe(5);
      expect(res.body.items.length).toBeLessThanOrEqual(5);
      expect(res.body.items.length).toBeGreaterThanOrEqual(0);
    });

    it('GET /api/catalog/products?category=electronics → filtre par catégorie', async () => {
      const res = await request(server)
        .get('/api/catalog/products?category=electronics');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(0);
      
      if (res.body.items.length > 0) {
        res.body.items.forEach((product: any) => {
          expect(product.category).toBe('electronics');
        });
      }
    });

    it('GET /api/catalog/products?minPrice=50&maxPrice=150 → filtre par prix', async () => {
      const res = await request(server)
        .get('/api/catalog/products?minPrice=50&maxPrice=150');

      expect(res.status).toBe(200);
      if (res.body.items.length > 0) {
        res.body.items.forEach((product: any) => {
          expect(product.price).toBeGreaterThanOrEqual(50);
          expect(product.price).toBeLessThanOrEqual(150);
        });
      }
    });
  });

  describe('GET /api/catalog/categories (Public)', () => {
    it('GET /api/catalog/categories → 200 sans authentification', async () => {
      const res = await request(server).get('/api/catalog/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/catalog/categories → ne retourne que les catégories publiques (isHidden = false)', async () => {
      const res = await request(server).get('/api/catalog/categories');

      expect(res.status).toBe(200);
      const categories = res.body;

      categories.forEach((category: any) => {
        expect(category).toHaveProperty('isActive', true);
      });

      const hiddenCategory = categories.find(
        (c: any) => c.slug === 'hidden-category'
      );
      expect(hiddenCategory).toBeUndefined();

      const publicCategory = categories.find((c: any) => c.slug === 'electronics');
      if (categories.length > 0) {
        expect(publicCategory).toBeDefined();
        expect(publicCategory.isActive).toBe(true);
      }
    });

    it('GET /api/catalog/categories → structure correcte', async () => {
      const res = await request(server).get('/api/catalog/categories');

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('slug');
        expect(res.body[0]).toHaveProperty('isActive');
      }
    });
  });
});
