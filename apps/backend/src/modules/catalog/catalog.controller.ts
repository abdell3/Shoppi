import { Controller, Get, HttpCode, HttpStatus, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CacheInterceptor } from '../../core/interceptors/cache.interceptor';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@ApiTags('Catalog')
@Controller('catalog')
@UseInterceptors(CacheInterceptor)
export class CatalogController {
  @ApiOperation({ summary: 'Lister les produits publics' })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  @Get('products')
  @HttpCode(HttpStatus.OK)
  getProducts(@Query() query: CatalogQueryDto): [] {
    return [];
  }
}
