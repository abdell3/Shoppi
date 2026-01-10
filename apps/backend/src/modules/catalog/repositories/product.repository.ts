import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository extends BaseRepository<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.product);
  }

  async findPaginated(params: { page: number; limit: number; category?: string; minPrice?: number; maxPrice?: number;}): Promise<{ items: Product[]; total: number; }> {
    const where: Prisma.ProductWhereInput = {
      isHidden: false,
    };

    if (params.category) {
      where.category = {
        slug: params.category,
      };
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) {
        where.price.gte = params.minPrice;
      }
      if (params.maxPrice !== undefined) {
        where.price.lte = params.maxPrice;
      }
    }

    const skip = (params.page - 1) * params.limit;
    const take = params.limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
      }),
      this.prisma.product.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }
}
