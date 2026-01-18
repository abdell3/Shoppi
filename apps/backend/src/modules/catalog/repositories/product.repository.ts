import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Product, Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository extends BaseRepository<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.product);
  }

  async findPaginated(params: { 
    page: number; 
    limit: number; 
    category?: string; 
    minPrice?: number; 
    maxPrice?: number;
  }): Promise<{ items: (Product & { category?: { slug: string } | null })[]; total: number; }> {
    const page = typeof params.page === 'string' ? parseInt(params.page, 10) : params.page;
    const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : params.limit;
    const minPrice = params.minPrice !== undefined 
      ? (typeof params.minPrice === 'string' ? parseFloat(params.minPrice) : params.minPrice)
      : undefined;
    const maxPrice = params.maxPrice !== undefined
      ? (typeof params.maxPrice === 'string' ? parseFloat(params.maxPrice) : params.maxPrice)
      : undefined;

    const where: Prisma.ProductWhereInput = {
      isHidden: false,
    };

    if (params.category) {
      where.category = {
        slug: params.category,
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const skip = Number((page - 1) * limit);
    const take = Number(limit);

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: {
            select: {
              slug: true,
            },
          },
        },
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

  async findAllAdmin(): Promise<Product[]> {
    return this.prisma.product.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async softDelete(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { isHidden: true },
    });
  }

  async generateUniqueSku(name: string): Promise<string> {
    const baseSku = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 20);

    let sku = baseSku;
    let counter = 1;

    while (await this.prisma.product.findUnique({ where: { sku } })) {
      sku = `${baseSku}-${counter}`;
      counter++;
    }

    return sku;
  }
}
