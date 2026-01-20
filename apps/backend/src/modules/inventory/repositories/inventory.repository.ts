import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Prisma, Inventory } from '@prisma/client';

@Injectable()
export class InventoryRepository extends BaseRepository<Inventory, Prisma.InventoryCreateInput, Prisma.InventoryUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.inventory);
  }

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

  async findOutOfStock(params: {
    page: number;
    limit: number;
  }): Promise<{
    items: (Inventory & {
      product: {
        id: string;
        name: string;
        sku: string;
        price: number;
        category: {
          id: string;
          name: string;
          slug: string;
        };
      };
    })[];
    total: number;
  }> {
    const skip = Number((params.page - 1) * params.limit);
    const take = Number(params.limit);

    const [items, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where: {
          quantity: 0,
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      this.prisma.inventory.count({
        where: {
          quantity: 0,
        },
      }),
    ]);

    return {
      items: items as any,
      total,
    };
  }
}
