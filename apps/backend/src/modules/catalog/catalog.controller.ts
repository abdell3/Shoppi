import { Controller, Get, HttpCode, HttpStatus, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheInterceptor } from '../../core/interceptors/cache.interceptor';
import { CatalogQueryDto } from './dto/catalog-query.dto';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog')
@Controller('catalog')
@UseInterceptors(CacheInterceptor)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @ApiOperation({ summary: 'Lister les produits publics' })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  @Get('products')
  @HttpCode(HttpStatus.OK)
  async getProducts(@Query() query: CatalogQueryDto) {
    return this.catalogService.findProducts(query);
  }
}
