import { Body, Controller, Patch, Param, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { UpdateStockBySkuDto } from './dto/update-stock-by-sku.dto';
import { UpdateStockDeltaDto } from './dto/update-stock-delta.dto';

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
    // Construire le DTO complet avec le SKU du paramètre de route
    const fullDto: UpdateStockBySkuDto = {
      sku,
      delta: dto.delta,
    };
    return this.inventoryService.updateStockBySku(fullDto);
  }
}
