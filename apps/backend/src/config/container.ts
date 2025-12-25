import "reflect-metadata";
import { container } from "tsyringe";
import { prisma } from "./prisma";

container.register("PrismaClient", { useValue: prisma });

export { container };