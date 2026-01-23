import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Prisma, Order, OrderItem } from '@prisma/client';

export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: {
      id: string;
      name: string;
      sku: string;
      price: number;
    };
  })[];
};

@Injectable()
export class OrderRepository extends BaseRepository<Order, Prisma.OrderCreateInput, Prisma.OrderUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.order);
  }

  async createWithItems(
    data: {
      userId: string;
      totalAmount: number;
      status: string;
      items: Array<{
        productId: string;
        quantity: number;
        priceAtPurchase: number;
      }>;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<OrderWithItems> {
    const client = tx ?? this.prisma;
    return client.order.create({
      data: {
        userId: data.userId,
        totalAmount: data.totalAmount,
        status: data.status,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
    });
  }

  async findByIdWithItems(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OrderWithItems | null> {
    const client = tx ?? this.prisma;
    return client.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OrderWithItems[]> {
    const client = tx ?? this.prisma;
    return client.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllWithItems(tx?: Prisma.TransactionClient): Promise<OrderWithItems[]> {
    const client = tx ?? this.prisma;
    return client.order.findMany({
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Order> {
    const client = tx ?? this.prisma;
    return client.order.update({
      where: { id },
      data: { status },
    });
  }
}
