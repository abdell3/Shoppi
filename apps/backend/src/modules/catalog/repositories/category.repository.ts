import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoryRepository extends BaseRepository<Category, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.category);
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { slug },
    });
  }

  async findPublic(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        isHidden: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAllAdmin(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { isHidden: true },
    });
  }
}
