import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogQueryDto } from './dto/catalog-query.dto';

@ApiTags('Catalog')
@Controller('catalog')
export class CatalogController {
  @ApiOperation({ summary: 'Lister les produits publics' })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  @Get('products')
  @HttpCode(HttpStatus.OK)
  getProducts(@Query() query: CatalogQueryDto): [] {
    return [];
  }
}
