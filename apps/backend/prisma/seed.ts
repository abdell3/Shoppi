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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 