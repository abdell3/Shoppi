import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto, OrderStatus } from './dto/update-order-status.dto';
import { UserRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Create a new order (CLIENT only)',
    description: 'Creates a new order with the provided items. Stock is reserved immediately. Prices are calculated from Product.price at order time.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data, insufficient stock, or product not available',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    if (req.user.role !== UserRole.CLIENT) {
      throw new ForbiddenException('Only CLIENT can create orders');
    }

    return this.ordersService.createOrder(req.user.userId, createOrderDto);
  }

  @ApiOperation({
    summary: 'Get all orders',
    description: 'CLIENT: returns only their own orders. ADMIN: returns all orders.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    type: [OrderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: AuthenticatedRequest): Promise<OrderResponseDto[]> {
    return this.ordersService.findAll(req.user.userId, req.user.role);
  }

  @ApiOperation({
    summary: 'Get order by ID',
    description: 'CLIENT: can only access their own orders. ADMIN: can access any order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order details',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @ApiOperation({
    summary: 'Cancel an order (CLIENT only, PENDING status only)',
    description: 'Cancels a PENDING order and restores the reserved stock. Only CLIENT can cancel their own orders.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully, stock restored',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled (not PENDING status)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Order does not belong to user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, req.user.userId, req.user.role);
  }

  @ApiOperation({
    summary: 'Update order status (ADMIN only)',
    description: 'Updates the order status. Only ADMIN can modify order status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only ADMIN can update order status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatus(
      id,
      updateOrderStatusDto.status,
      req.user.userId,
      req.user.role,
    );
  }
}
