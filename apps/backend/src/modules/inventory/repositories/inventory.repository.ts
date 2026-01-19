import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, Inventory } from '@prisma/client';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Inventory | null> {
    const client = tx ?? this.prisma;
    return client.inventory.findUnique({ where: { productId } });
  }

  async createForProduct(
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Inventory> {
    const client = tx ?? this.prisma;
    return client.inventory.create({
      data: {
        product: { connect: { id: productId } },
        quantity,
      },
    });
  }

  async updateQuantityByProductId(
    productId: string,
    delta: number,
    tx?: Prisma.TransactionClient,
  ): Promise<Inventory> {
    const client = tx ?? this.prisma;
    return client.inventory.update({
      where: { productId },
      data: {
        quantity: { increment: delta },
      },
    });
  }
}
