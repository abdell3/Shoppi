import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { InventoryRepository } from './repositories/inventory.repository';
import { UpdateStockBySkuDto } from './dto/update-stock-by-sku.dto';
import { OutOfStockQueryDto } from './dto/out-of-stock-query.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async updateStockBySku(dto: UpdateStockBySkuDto): Promise<{
    sku: string;
    quantity: number;
    updatedAt: Date;
  }> {
    const { sku, delta } = dto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { sku } });
      if (!product) {
        throw new NotFoundException(`Product with SKU ${sku} not found`);
      }

      let inventory = await this.inventoryRepository.findByProductId(product.id, tx);
      const currentQuantity = inventory?.quantity ?? 0;
      const nextQuantity = currentQuantity + delta;

      if (nextQuantity < 0) {
        throw new BadRequestException('Insufficient stock');
      }

      if (!inventory) {
        inventory = await this.inventoryRepository.createForProduct(
          product.id,
          nextQuantity,
          tx,
        );
      } else {
        inventory = await this.inventoryRepository.updateQuantityByProductId(
          product.id,
          delta,
          tx,
        );
      }

      return {
        sku: product.sku,
        quantity: inventory.quantity,
        updatedAt: inventory.updatedAt,
      };
    });
  }

  async getOutOfStock(query: OutOfStockQueryDto): Promise<{
    items: Array<{
      id: string;
      quantity: number;
      updatedAt: Date;
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
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.inventoryRepository.findOutOfStock({
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        updatedAt: item.updatedAt,
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          price: item.product.price,
          category: {
            id: item.product.category.id,
            name: item.product.category.name,
            slug: item.product.category.slug,
          },
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
