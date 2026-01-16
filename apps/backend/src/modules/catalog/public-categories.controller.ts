import { Controller, Get, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheInterceptor } from '../../core/interceptors/cache.interceptor';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryEntity } from './entities/category.entity';

@ApiTags('Catalog')
@Controller('catalog/categories')
@UseInterceptors(CacheInterceptor)
export class PublicCategoriesController {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  @ApiOperation({ summary: 'List all public categories' })
  @ApiResponse({
    status: 200,
    description: 'List of public categories',
    type: [CategoryEntity],
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(): Promise<CategoryEntity[]> {
    const categories = await this.categoryRepository.findPublic();
    return CategoryEntity.fromPersistenceArray(categories);
  }
}
