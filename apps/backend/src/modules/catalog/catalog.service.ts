import { Injectable } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { ProductEntity } from './entities/product.entity';

@Injectable()
export class CatalogService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findProducts(params: CatalogQueryDto): Promise<{
    items: ProductEntity[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const { items, total } = await this.productRepository.findPaginated({
      page,
      limit,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    });

    const entities = items.map(item => {
      const persistence: {
        id: string;
        name: string;
        description: string;
        price: number;
        categoryId: string;
        isHidden: boolean;
        categorySlug: string | null;
      } = {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: item.categoryId,
        isHidden: item.isHidden,
        categorySlug: (item as any).category?.slug || null,
      };
      return ProductEntity.fromPersistence(persistence);
    });
    const totalPages = Math.ceil(total / limit);

    return {
      items: entities,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}