import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'child_process';
import { resolve } from 'path';
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { hashPassword } from '../../../common/utils/password.util';

describe('OrdersModule (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let adminToken: string;
  let clientToken: string;
  let client2Token: string;
  let prisma: PrismaService;
  let categoryId: string;
  let product1Id: string;
  let product2Id: string;
  let productHiddenId: string;
  let clientUserId: string;
  let client2UserId: string;

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
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

    // Cleanup
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    const adminPassword = await hashPassword('AdminPass123!');
    await prisma.user.upsert({
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
    clientUserId = clientUser.id;

    const client2Password = await hashPassword('Client2Pass123!');
    const client2User = await prisma.user.upsert({
      where: { email: 'client2@test.com' },
      update: { password: client2Password, role: UserRole.CLIENT, isActive: true },
      create: {
        firstName: 'Client2',
        lastName: 'Test',
        email: 'client2@test.com',
        password: client2Password,
        role: UserRole.CLIENT,
        isActive: true,
      },
    });
    client2UserId = client2User.id;

    // Create category
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

    // Login users
    const adminLoginRes = await request(server).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'AdminPass123!',
    });
    if (adminLoginRes.status !== 200 || !adminLoginRes.body.accessToken) {
      throw new Error(`Admin login failed: ${adminLoginRes.status}`);
    }
    adminToken = adminLoginRes.body.accessToken;

    const clientLoginRes = await request(server).post('/api/auth/login').send({
      email: 'client@test.com',
      password: 'ClientPass123!',
    });
    if (clientLoginRes.status !== 200 || !clientLoginRes.body.accessToken) {
      throw new Error(`Client login failed: ${clientLoginRes.status}`);
    }
    clientToken = clientLoginRes.body.accessToken;

    const client2LoginRes = await request(server).post('/api/auth/login').send({
      email: 'client2@test.com',
      password: 'Client2Pass123!',
    });
    if (client2LoginRes.status !== 200 || !client2LoginRes.body.accessToken) {
      throw new Error(`Client2 login failed: ${client2LoginRes.status}`);
    }
    client2Token = client2LoginRes.body.accessToken;

    // Create products
    const product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        description: 'Test product 1',
        price: 99.99,
        sku: 'SKU-PRODUCT-1',
        isHidden: false,
        categoryId: categoryId,
      },
    });
    product1Id = product1.id;

    const product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        description: 'Test product 2',
        price: 149.99,
        sku: 'SKU-PRODUCT-2',
        isHidden: false,
        categoryId: categoryId,
      },
    });
    product2Id = product2.id;

    const productHidden = await prisma.product.create({
      data: {
        name: 'Hidden Product',
        description: 'Hidden test product',
        price: 199.99,
        sku: 'SKU-PRODUCT-HIDDEN',
        isHidden: true,
        categoryId: categoryId,
      },
    });
    productHiddenId = productHidden.id;

    // Create inventory
    await prisma.inventory.create({
      data: {
        productId: product1Id,
        quantity: 10,
      },
    });

    await prisma.inventory.create({
      data: {
        productId: product2Id,
        quantity: 5,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
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

  describe('POST /api/orders', () => {
    it('POST /api/orders → 201 success CLIENT creates order', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [
            { productId: product1Id, quantity: 2 },
            { productId: product2Id, quantity: 1 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.userId).toBe(clientUserId);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].quantity).toBe(2);
      expect(res.body.items[0].unitPriceAtPurchase).toBe(99.99);
      expect(res.body.items[1].quantity).toBe(1);
      expect(res.body.items[1].unitPriceAtPurchase).toBe(149.99);
    });

    it('POST /api/orders → 403 ADMIN cannot create order', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(403);
    });

    it('POST /api/orders → 401 without token', async () => {
      const res = await request(server).post('/api/orders').send({
        items: [{ productId: product1Id, quantity: 1 }],
      });

      expect(res.status).toBe(401);
    });

    it('POST /api/orders → 400 insufficient stock', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 100 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient stock');
    });

    it('POST /api/orders → 400 product not found', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: 'non-existent-id', quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not found');
    });

    it('POST /api/orders → 400 hidden product', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: productHiddenId, quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not available');
    });

    it('POST /api/orders → 400 invalid quantity (0)', async () => {
      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: product1Id, quantity: 0 }],
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('GET /api/orders', () => {
    let order1Id: string;
    let order2Id: string;

    beforeAll(async () => {
      // Create orders for testing
      const order1 = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });
      order1Id = order1.id;

      const order2 = await prisma.order.create({
        data: {
          userId: client2UserId,
          totalAmount: 149.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product2Id,
              quantity: 1,
              priceAtPurchase: 149.99,
            },
          },
        },
      });
      order2Id = order2.id;
    });

    it('GET /api/orders → 200 CLIENT sees only own orders', async () => {
      const res = await request(server)
        .get('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // CLIENT should only see orders where userId matches
      res.body.forEach((order: any) => {
        expect(order.userId).toBe(clientUserId);
      });
    });

    it('GET /api/orders → 200 ADMIN sees all orders', async () => {
      const res = await request(server)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/orders → 401 without token', async () => {
      const res = await request(server).get('/api/orders');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      const order = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });
      orderId = order.id;
    });

    it('GET /api/orders/:id → 200 CLIENT sees own order', async () => {
      const res = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
      expect(res.body.userId).toBe(clientUserId);
    });

    it('GET /api/orders/:id → 200 ADMIN sees any order', async () => {
      const res = await request(server)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(orderId);
    });

    it('GET /api/orders/:id → 403 CLIENT cannot see other client order', async () => {
      // Create order for client2
      const otherOrder = await prisma.order.create({
        data: {
          userId: client2UserId,
          totalAmount: 149.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product2Id,
              quantity: 1,
              priceAtPurchase: 149.99,
            },
          },
        },
      });

      const res = await request(server)
        .get(`/api/orders/${otherOrder.id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/orders/:id → 404 order not found', async () => {
      const res = await request(server)
        .get('/api/orders/non-existent-id')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/orders/:id/cancel', () => {
    let pendingOrderId: string;
    let paidOrderId: string;

    beforeEach(async () => {
      // Create PENDING order
      const pendingOrder = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 2,
              priceAtPurchase: 99.99,
            },
          },
        },
      });
      pendingOrderId = pendingOrder.id;

      // Create PAID order
      const paidOrder = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 149.99,
          status: 'PAID',
          items: {
            create: {
              productId: product2Id,
              quantity: 1,
              priceAtPurchase: 149.99,
            },
          },
        },
      });
      paidOrderId = paidOrder.id;
    });

    afterEach(async () => {
      await prisma.orderItem.deleteMany({ where: { orderId: { in: [pendingOrderId, paidOrderId] } } });
      await prisma.order.deleteMany({ where: { id: { in: [pendingOrderId, paidOrderId] } } });
    });

    it('PATCH /api/orders/:id/cancel → 200 CLIENT cancels PENDING order', async () => {
      const res = await request(server)
        .patch(`/api/orders/${pendingOrderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');
      
      // Verify stock was restored
      const inventory = await prisma.inventory.findUnique({
        where: { productId: product1Id },
      });
      expect(inventory?.quantity).toBeGreaterThanOrEqual(10);
    });

    it('PATCH /api/orders/:id/cancel → 400 cannot cancel PAID order', async () => {
      const res = await request(server)
        .patch(`/api/orders/${paidOrderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot cancel');
    });

    it('PATCH /api/orders/:id/cancel → 403 CLIENT cannot cancel other client order', async () => {
      const otherOrder = await prisma.order.create({
        data: {
          userId: client2UserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });

      const res = await request(server)
        .patch(`/api/orders/${otherOrder.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);

      await prisma.orderItem.deleteMany({ where: { orderId: otherOrder.id } });
      await prisma.order.delete({ where: { id: otherOrder.id } });
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });
      orderId = order.id;
    });

    afterEach(async () => {
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } });
    });

    it('PATCH /api/orders/:id/status → 200 ADMIN updates status', async () => {
      const res = await request(server)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PAID');
    });

    it('PATCH /api/orders/:id/status → 403 CLIENT cannot update status', async () => {
      const res = await request(server)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(403);
    });

    it('PATCH /api/orders/:id/status → 400 PAID → CANCELLED transition forbidden', async () => {
      // Create PAID order
      const paidOrder = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PAID',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });

      const res = await request(server)
        .patch(`/api/orders/${paidOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid status transition');

      await prisma.orderItem.deleteMany({ where: { orderId: paidOrder.id } });
      await prisma.order.delete({ where: { id: paidOrder.id } });
    });

    it('PATCH /api/orders/:id/status → 400 CANCELLED → PENDING transition forbidden', async () => {
      const cancelledOrder = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'CANCELLED',
          items: {
            create: {
              productId: product1Id,
              quantity: 1,
              priceAtPurchase: 99.99,
            },
          },
        },
      });

      const res = await request(server)
        .patch(`/api/orders/${cancelledOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid status transition');

      await prisma.orderItem.deleteMany({ where: { orderId: cancelledOrder.id } });
      await prisma.order.delete({ where: { id: cancelledOrder.id } });
    });

    it('PATCH /api/orders/:id/status → 200 ADMIN cancels PENDING order and restores stock', async () => {
      const initialInventory = await prisma.inventory.findUnique({
        where: { productId: product1Id },
      });
      const initialStock = initialInventory?.quantity ?? 0;

      const pendingOrder = await prisma.order.create({
        data: {
          userId: clientUserId,
          totalAmount: 99.99,
          status: 'PENDING',
          items: {
            create: {
              productId: product1Id,
              quantity: 2,
              priceAtPurchase: 99.99,
            },
          },
        },
      });

      await prisma.inventory.update({
        where: { productId: product1Id },
        data: { quantity: { decrement: 2 } },
      });

      const res = await request(server)
        .patch(`/api/orders/${pendingOrder.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: product1Id },
      });
      expect(finalInventory?.quantity).toBe(initialStock);

      await prisma.orderItem.deleteMany({ where: { orderId: pendingOrder.id } });
      await prisma.order.delete({ where: { id: pendingOrder.id } });
    });
  });

  describe('Tests critiques d\'intégrité stock (Orders → Inventory)', () => {
    let testProductId: string;
    let testProductSku: string;

    beforeEach(async () => {
      const testProduct = await prisma.product.create({
        data: {
          name: 'Test Product for Stock Integrity',
          description: 'Product for stock integrity tests',
          price: 49.99,
          sku: `SKU-STOCK-TEST-${Date.now()}`,
          isHidden: false,
          categoryId,
        },
      });
      testProductId = testProduct.id;
      testProductSku = testProduct.sku;

      await prisma.inventory.create({
        data: {
          productId: testProductId,
          quantity: 5,
        },
      });
    });

    afterEach(async () => {
      // Récupérer les Order qui ont des OrderItem avec productId: testProductId
      const ordersWithTestProduct = await prisma.order.findMany({
        where: {
          items: {
            some: {
              productId: testProductId,
            },
          },
        },
        select: { id: true },
      });

      const orderIds = ordersWithTestProduct.map((o) => o.id);

      // Supprimer d'abord les OrderItem de ces Order (pour éviter la violation de contrainte de clé étrangère)
      if (orderIds.length > 0) {
        await prisma.orderItem.deleteMany({
          where: {
            orderId: { in: orderIds },
          },
        });
        // Puis supprimer ces Order
        await prisma.order.deleteMany({
          where: {
            id: { in: orderIds },
          },
        });
      }

      await prisma.inventory.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    });

    it('POST /api/orders → Vérification décrément stock lors création commande', async () => {
      const initialStock = (await prisma.inventory.findUnique({ where: { productId: testProductId } }))?.quantity ?? 0;
      const orderQuantity = 3;

      const res = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: orderQuantity }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(finalInventory?.quantity).toBe(initialStock - orderQuantity);
      expect(finalInventory?.quantity).toBeGreaterThanOrEqual(0);
    });

    it('POST /api/orders → Rollback si stock insuffisant après validation', async () => {
      const initialStock = (await prisma.inventory.findUnique({ where: { productId: testProductId } }))?.quantity ?? 0;
      
      const firstOrderRes = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: initialStock }],
        });

      expect(firstOrderRes.status).toBe(201);

      const secondOrderRes = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: 1 }],
        });

      expect(secondOrderRes.status).toBe(400);
      expect(secondOrderRes.body.message).toContain('Insufficient stock');

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(finalInventory?.quantity).toBeGreaterThanOrEqual(0);
    });

    it('POST /api/orders → Test de concurrence : deux commandes simultanées sur stock limité', async () => {
      const initialStock = (await prisma.inventory.findUnique({ where: { productId: testProductId } }))?.quantity ?? 0;
      const orderQuantity = 4; // Chaque commande demande 4, mais stock = 5

      const promise1 = request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: orderQuantity }],
        });

      const promise2 = request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: orderQuantity }],
        });

      const [res1, res2] = await Promise.all([promise1, promise2]);

      const successCount = [res1.status === 201, res2.status === 201].filter(Boolean).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      const failureCount = [res1.status === 400, res2.status === 400].filter(Boolean).length;
      expect(failureCount).toBeGreaterThanOrEqual(1);

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(finalInventory?.quantity).toBeGreaterThanOrEqual(0);
      expect(finalInventory?.quantity).toBeLessThanOrEqual(initialStock);
    });

    it('PATCH /api/orders/:id/cancel → Vérification restauration stock lors annulation', async () => {
      const initialStock = (await prisma.inventory.findUnique({ where: { productId: testProductId } }))?.quantity ?? 0;
      const orderQuantity = 2;

      const createRes = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: orderQuantity }],
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;

      const inventoryAfterOrder = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(inventoryAfterOrder?.quantity).toBe(initialStock - orderQuantity);

      const cancelRes = await request(server)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(finalInventory?.quantity).toBe(initialStock);
      expect(finalInventory?.quantity).toBeGreaterThanOrEqual(0);
    });

    it('PATCH /api/orders/:id/status → Vérification restauration stock lors annulation ADMIN', async () => {
      const initialStock = (await prisma.inventory.findUnique({ where: { productId: testProductId } }))?.quantity ?? 0;
      const orderQuantity = 2;

      const createRes = await request(server)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: testProductId, quantity: orderQuantity }],
        });

      expect(createRes.status).toBe(201);
      const orderId = createRes.body.id;

      const inventoryAfterOrder = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(inventoryAfterOrder?.quantity).toBe(initialStock - orderQuantity);

      const cancelRes = await request(server)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CANCELLED' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe('CANCELLED');

      const finalInventory = await prisma.inventory.findUnique({
        where: { productId: testProductId },
      });
      expect(finalInventory?.quantity).toBe(initialStock);
      expect(finalInventory?.quantity).toBeGreaterThanOrEqual(0);
    });
  });
});
