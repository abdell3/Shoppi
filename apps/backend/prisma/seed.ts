import "dotenv/config";
import { UserRole } from "@prisma/client";
import { hashPassword } from "../src/common/utils/password.util";
import { PrismaService } from "../src/database/prisma.service";

const prisma = new PrismaService();

async function main() {
  const adminEmail = "admin@shoppi.dev";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        firstName: "Admin",
        lastName: "Root",
        email: adminEmail,
        password: await hashPassword("Admin123!"),
        role: UserRole.ADMIN,
      },
    });
    console.log("Admin user created");
  } else {
    console.log("Admin user already exists");
  }

  const clientEmail = "client@shoppi.local";
  const existingClient = await prisma.user.findUnique({
    where: { email: clientEmail },
  });

  if (!existingClient) {
    await prisma.user.create({
      data: {
        firstName: "John",
        lastName: "Doe",
        email: clientEmail,
        password: await hashPassword("Client123!"),
        role: UserRole.CLIENT,
      },
    });
    console.log("Client user created");
  } else {
    console.log("Client user already exists");
  }

  const electronicsCategory = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const phonesCategory = await prisma.category.upsert({
    where: { slug: "phones" },
    update: {},
    create: {
      name: "Phones",
      slug: "phones",
    },
  });

  const accessoriesCategory = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
    },
  });

  console.log("Categories seeded");

  await prisma.product.upsert({
    where: { sku: "IPHONE-14-128" },
    update: {},
    create: {
      name: "iPhone 14",
      description: "Latest iPhone with A16 Bionic chip and advanced camera system",
      price: 899.99,
      sku: "IPHONE-14-128",
      isHidden: false,
      categoryId: phonesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "SAMSUNG-S23-256" },
    update: {},
    create: {
      name: "Samsung Galaxy S23",
      description: "Premium Android smartphone with 256GB storage",
      price: 849.99,
      sku: "SAMSUNG-S23-256",
      isHidden: false,
      categoryId: phonesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "MACBOOK-PRO-14" },
    update: {},
    create: {
      name: "MacBook Pro 14",
      description: "Professional laptop with M2 Pro chip and Liquid Retina XDR display",
      price: 1999.99,
      sku: "MACBOOK-PRO-14",
      isHidden: false,
      categoryId: electronicsCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "USB-C-CABLE-1M" },
    update: {},
    create: {
      name: "USB-C Cable 1m",
      description: "High-quality USB-C charging and data cable, 1 meter length",
      price: 19.99,
      sku: "USB-C-CABLE-1M",
      isHidden: false,
      categoryId: accessoriesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "WIRELESS-EARBUDS" },
    update: {},
    create: {
      name: "Wireless Earbuds",
      description: "Premium wireless earbuds with noise cancellation",
      price: 129.99,
      sku: "WIRELESS-EARBUDS",
      isHidden: false,
      categoryId: accessoriesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "LAPTOP-STAND" },
    update: {},
    create: {
      name: "Laptop Stand",
      description: "Ergonomic aluminum laptop stand for better posture",
      price: 49.99,
      sku: "LAPTOP-STAND",
      isHidden: false,
      categoryId: accessoriesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "GAMING-MOUSE" },
    update: {},
    create: {
      name: "Gaming Mouse",
      description: "High-precision gaming mouse with RGB lighting",
      price: 79.99,
      sku: "GAMING-MOUSE",
      isHidden: false,
      categoryId: accessoriesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "MONITOR-27-4K" },
    update: {},
    create: {
      name: "27-inch 4K Monitor",
      description: "Ultra HD 4K monitor with HDR support",
      price: 599.99,
      sku: "MONITOR-27-4K",
      isHidden: false,
      categoryId: electronicsCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "KEYBOARD-MECHANICAL" },
    update: {},
    create: {
      name: "Mechanical Keyboard",
      description: "RGB mechanical keyboard with Cherry MX switches",
      price: 149.99,
      sku: "KEYBOARD-MECHANICAL",
      isHidden: false,
      categoryId: accessoriesCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "TABLET-10-128" },
    update: {},
    create: {
      name: "10-inch Tablet 128GB",
      description: "Versatile tablet perfect for work and entertainment",
      price: 399.99,
      sku: "TABLET-10-128",
      isHidden: false,
      categoryId: electronicsCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "HIDDEN-PRODUCT-TEST" },
    update: {},
    create: {
      name: "Hidden Product Test",
      description: "This product is hidden and should not appear in public catalog",
      price: 99.99,
      sku: "HIDDEN-PRODUCT-TEST",
      isHidden: true,
      categoryId: electronicsCategory.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: "DISCONTINUED-PHONE" },
    update: {},
    create: {
      name: "Discontinued Phone",
      description: "Old phone model no longer available",
      price: 299.99,
      sku: "DISCONTINUED-PHONE",
      isHidden: true,
      categoryId: phonesCategory.id,
    },
  });

  console.log("Products seeded");

  // ============================================
  // USERS POUR POSTMAN (emails fixes)
  // ============================================
  const postmanAdminEmail = "admin@test.com";
  const postmanClientEmail = "user@test.com";

  const postmanAdmin = await prisma.user.upsert({
    where: { email: postmanAdminEmail },
    update: {
      password: await hashPassword("password123"),
      isActive: true,
    },
    create: {
      firstName: "Admin",
      lastName: "Test",
      email: postmanAdminEmail,
      password: await hashPassword("password123"),
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const postmanClient = await prisma.user.upsert({
    where: { email: postmanClientEmail },
    update: {
      password: await hashPassword("password123"),
      isActive: true,
    },
    create: {
      firstName: "Test",
      lastName: "User",
      email: postmanClientEmail,
      password: await hashPassword("password123"),
      role: UserRole.CLIENT,
      isActive: true,
    },
  });

  console.log(`✅ Postman users created/updated:
    - Admin: ${postmanAdminEmail} (ID: ${postmanAdmin.id})
    - Client: ${postmanClientEmail} (ID: ${postmanClient.id})`);

  // ============================================
  // INVENTORY - Stock pour tous les produits
  // ============================================
  const allProducts = await prisma.product.findMany({
    where: { isHidden: false },
  });

  const inventoryData = [
    { sku: "IPHONE-14-128", quantity: 5 }, // Stock moyen
    { sku: "SAMSUNG-S23-256", quantity: 1 }, // Stock faible (pour tester stock insuffisant)
    { sku: "MACBOOK-PRO-14", quantity: 10 }, // Stock élevé
    { sku: "USB-C-CABLE-1M", quantity: 100 }, // Stock très élevé
    { sku: "WIRELESS-EARBUDS", quantity: 50 }, // Stock élevé
    { sku: "LAPTOP-STAND", quantity: 25 }, // Stock moyen
    { sku: "GAMING-MOUSE", quantity: 30 }, // Stock moyen
    { sku: "MONITOR-27-4K", quantity: 15 }, // Stock moyen
    { sku: "KEYBOARD-MECHANICAL", quantity: 20 }, // Stock moyen
    { sku: "TABLET-10-128", quantity: 8 }, // Stock moyen
  ];

  const inventoryResults: Array<{ sku: string; quantity: number }> = [];

  for (const inv of inventoryData) {
    const product = await prisma.product.findUnique({
      where: { sku: inv.sku },
    });

    if (product) {
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: { quantity: inv.quantity },
        create: {
          productId: product.id,
          quantity: inv.quantity,
        },
      });
      inventoryResults.push({ sku: inv.sku, quantity: inv.quantity });
    }
  }

  // Ajouter du stock pour les produits qui n'ont pas été explicitement listés
  for (const product of allProducts) {
    const hasInventory = await prisma.inventory.findUnique({
      where: { productId: product.id },
    });

    if (!hasInventory && !product.isHidden) {
      await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity: 10, // Stock par défaut
        },
      });
      inventoryResults.push({ sku: product.sku, quantity: 10 });
    }
  }

  console.log(`✅ Inventory seeded: ${inventoryResults.length} products with stock`);
  console.log(`   - Low stock (1): SAMSUNG-S23-256`);
  console.log(`   - High stock (100): USB-C-CABLE-1M`);

  // ============================================
  // CART - Panier pour user et guest
  // ============================================
  const iphoneProduct = await prisma.product.findUnique({
    where: { sku: "IPHONE-14-128" },
  });
  const earbudsProduct = await prisma.product.findUnique({
    where: { sku: "WIRELESS-EARBUDS" },
  });
  const cableProduct = await prisma.product.findUnique({
    where: { sku: "USB-C-CABLE-1M" },
  });

  if (iphoneProduct && earbudsProduct && cableProduct) {
    // Cart pour user (postmanClient) - chercher un cart ACTIVE existant ou en créer un
    let userCart = await prisma.cart.findFirst({
      where: {
        userId: postmanClient.id,
        status: "ACTIVE",
      },
    });

    if (!userCart) {
      userCart = await prisma.cart.create({
        data: {
          userId: postmanClient.id,
          status: "ACTIVE",
          version: 0,
        },
      });
    }

    // Supprimer les items existants pour éviter les doublons
    await prisma.cartItem.deleteMany({
      where: { cartId: userCart.id },
    });

    // Ajouter des items au panier user
    await prisma.cartItem.create({
      data: {
        cartId: userCart.id,
        productId: iphoneProduct.id,
        quantity: 1,
      },
    });

    await prisma.cartItem.create({
      data: {
        cartId: userCart.id,
        productId: earbudsProduct.id,
        quantity: 2,
      },
    });

    console.log(`✅ User cart created/updated: ${userCart.id} with 2 items`);

    // Cart pour guest
    const guestId = "guest_test_123";
    let guestCart = await prisma.cart.findFirst({
      where: {
        guestId: guestId,
        status: "ACTIVE",
      },
    });

    if (!guestCart) {
      guestCart = await prisma.cart.create({
        data: {
          guestId: guestId,
          status: "ACTIVE",
          version: 0,
        },
      });
    }

    // Supprimer les items existants pour éviter les doublons
    await prisma.cartItem.deleteMany({
      where: { cartId: guestCart.id },
    });

    // Ajouter des items au panier guest
    await prisma.cartItem.create({
      data: {
        cartId: guestCart.id,
        productId: cableProduct.id,
        quantity: 3,
      },
    });

    console.log(`✅ Guest cart created/updated: ${guestCart.id} (guestId: ${guestId}) with 1 item`);
  }

  // ============================================
  // ORDERS - Commandes de test
  // ============================================
  if (iphoneProduct && earbudsProduct) {
    // Order 1: Commande simple avec 1 item (PENDING)
    const order1 = await prisma.order.create({
      data: {
        userId: postmanClient.id,
        totalAmount: iphoneProduct.price * 1,
        status: "PENDING",
        items: {
          create: {
            productId: iphoneProduct.id,
            quantity: 1,
            priceAtPurchase: iphoneProduct.price,
          },
        },
      },
    });

    console.log(`✅ Order 1 created: ${order1.id} (PENDING) - 1 item - Total: $${order1.totalAmount}`);

    // Order 2: Commande avec plusieurs items (PAID)
    const order2Total = iphoneProduct.price * 2 + earbudsProduct.price * 1;
    const order2 = await prisma.order.create({
      data: {
        userId: postmanClient.id,
        totalAmount: order2Total,
        status: "PAID",
        items: {
          create: [
            {
              productId: iphoneProduct.id,
              quantity: 2,
              priceAtPurchase: iphoneProduct.price,
            },
            {
              productId: earbudsProduct.id,
              quantity: 1,
              priceAtPurchase: earbudsProduct.price,
            },
          ],
        },
      },
    });

    console.log(`✅ Order 2 created: ${order2.id} (PAID) - 2 items - Total: $${order2Total}`);
  }

  // ============================================
  // RÉSUMÉ FINAL
  // ============================================
  const userCount = await prisma.user.count();
  const productCount = await prisma.product.count({ where: { isHidden: false } });
  const inventoryCount = await prisma.inventory.count();
  const cartCount = await prisma.cart.count({ where: { status: "ACTIVE" } });
  const orderCount = await prisma.order.count();

  console.log(`
📊 SEED SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Users: ${userCount} (including Postman test users)
✅ Products: ${productCount} visible products
✅ Inventory: ${inventoryCount} products with stock
✅ Active Carts: ${cartCount} (1 user + 1 guest)
✅ Orders: ${orderCount} test orders

🔑 POSTMAN TEST CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Admin:  ${postmanAdminEmail} / password123
   Client: ${postmanClientEmail} / password123

🧪 TEST SCENARIOS READY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ Login with test credentials
   ✅ Get products from catalog
   ✅ Test stock insufficient (SAMSUNG-S23-256: 1 unit)
   ✅ Test order creation (direct, without cart)
   ✅ Test cart operations (user + guest)
   ✅ Test cart merge (guest → user)
   ✅ View existing orders
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 