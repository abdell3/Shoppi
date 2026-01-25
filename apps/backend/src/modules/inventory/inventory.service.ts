import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { InventoryRepository } from './repositories/inventory.repository';
import { OutOfStockQueryDto } from './dto/out-of-stock-query.dto';

@Injectable()
export class InventoryService {
  constructor(
    // DETTE TECHNIQUE ACCEPTÉE (Inventory uniquement) :
    // Accès direct à PrismaService JUSTIFIÉ pour orchestrer les transactions Prisma
    // nécessaires pour garantir l'atomicité entre vérification produit et mise à jour stock.
    // ⚠️ NE PAS APPLIQUER CE MODÈLE AILLEURS sans validation explicite.
    private readonly prisma: PrismaService,
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: Logger,
  ) {}

  async updateStockBySku(sku: string, delta: number): Promise<{
    sku: string;
    quantity: number;
    updatedAt: Date;
  }> {
    this.logger.log(`Updating stock for SKU ${sku} with delta ${delta}`);

    return this.prisma.$transaction(async (tx) => {
      const product = await this.productRepository.findBySku(sku, tx);
      if (!product) {
        this.logger.warn(`Product with SKU ${sku} not found`);
        throw new NotFoundException(`Product with SKU ${sku} not found`);
      }

      let inventory = await this.inventoryRepository.findByProductId(product.id, tx);
      const currentQuantity = inventory?.quantity ?? 0;
      const nextQuantity = currentQuantity + delta;

      if (nextQuantity < 0) {
        this.logger.warn(
          `Insufficient stock for SKU ${sku}. Current: ${currentQuantity}, Delta: ${delta}`,
        );
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

      const updatedInventory = await this.inventoryRepository.findByProductId(product.id, tx);
      if (updatedInventory && updatedInventory.quantity < 0) {
        this.logger.error(
          `Stock integrity violation for SKU ${sku}. Quantity became negative (${updatedInventory.quantity}).`,
        );
        throw new BadRequestException('Insufficient stock - stock would become negative');
      }

      this.logger.log(`Stock updated for SKU ${sku}. New quantity: ${updatedInventory?.quantity ?? inventory.quantity}`);

      const finalInventory = updatedInventory ?? inventory;
      return {
        sku: product.sku,
        quantity: finalInventory.quantity,
        updatedAt: finalInventory.updatedAt,
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
