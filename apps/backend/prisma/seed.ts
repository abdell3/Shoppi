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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 