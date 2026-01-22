import { Body, Controller, Patch, Param, Get, Query, UseGuards, HttpStatus, HttpCode, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiTags, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { UpdateStockDeltaDto } from './dto/update-stock-delta.dto';
import { OutOfStockQueryDto } from './dto/out-of-stock-query.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Update product stock by SKU (Admin only)' })
  @ApiParam({
    name: 'sku',
    description: 'SKU du produit',
    example: 'SKU-IPHONE-14-BLK',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock updated successfully',
    schema: {
      example: {
        sku: 'SKU-IPHONE-14-BLK',
        quantity: 15,
        updatedAt: '2026-01-19T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Patch('stock/:sku')
  @HttpCode(HttpStatus.OK)
  async updateStock(
    @Param('sku') sku: string,
    @Body() dto: UpdateStockDeltaDto,
  ): Promise<{
    sku: string;
    quantity: number;
    updatedAt: Date;
  }> {
    return this.inventoryService.updateStockBySku(sku, dto.delta);
  }

  @ApiOperation({ 
    summary: 'Get products out of stock (Admin only)',
    description: 'Retrieves a paginated list of products that are out of stock (quantity = 0). Returns 404 if no products are out of stock.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'List of products out of stock (quantity = 0)',
    schema: {
      example: {
        items: [
          {
            id: 'inventory-id',
            quantity: 0,
            updatedAt: '2026-01-19T12:00:00.000Z',
            product: {
              id: 'product-id',
              name: 'iPhone 15 Pro',
              sku: 'SKU-IPHONE-15-PRO',
              price: 999.99,
              category: {
                id: 'category-id',
                name: 'Electronics',
                slug: 'electronics',
              },
            },
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No products out of stock found - Returns 404 when there are no products with quantity = 0 (business rule: empty result set triggers 404)' 
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @Get('out-of-stock')
  @HttpCode(HttpStatus.OK)
  async getOutOfStock(@Query() query: OutOfStockQueryDto): Promise<{
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
    const result = await this.inventoryService.getOutOfStock(query);
    
    // l'API doit retourner 404 au lieu d'un tableau vide avec meta.total = 0
    if (result.items.length === 0 && result.meta.total === 0) {
      throw new NotFoundException('No products out of stock found');
    }

    return result;
  }
}
