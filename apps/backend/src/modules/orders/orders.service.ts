import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderRepository } from './repositories/order.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { InventoryRepository } from '../inventory/repositories/inventory.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto, OrderItemResponseDto } from './dto/order-response.dto';
import { OrderStatus } from './dto/update-order-status.dto';
import { UserRole } from '@prisma/client';
import { OrderWithItems } from './repositories/order.repository';

@Injectable()
export class OrdersService {
  private readonly TAX_RATE = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: Logger,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.log(`Creating order for user ${userId} with ${createOrderDto.items.length} items`);

    return this.prisma.$transaction(async (tx) => {
      const productValidations = await Promise.all(
        createOrderDto.items.map(async (item) => {
          const product = await this.productRepository.findById(item.productId, tx);
          
          if (!product) {
            throw new BadRequestException(`Product with ID ${item.productId} not found`);
          }

          if (product.isHidden) {
            throw new BadRequestException(`Product with ID ${item.productId} is not available`);
          }

          const inventory = await this.inventoryRepository.findByProductId(product.id, tx);
          const availableStock = inventory?.quantity ?? 0;

          if (availableStock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
            );
          }

          return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            quantity: item.quantity,
            unitPrice: product.price,
          };
        }),
      );

      const subtotal = productValidations.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      const taxAmount = subtotal * this.TAX_RATE;
      const totalAmount = subtotal + taxAmount;

      for (const validation of productValidations) {
        const inventory = await this.inventoryRepository.findByProductId(validation.productId, tx);
        
        if (!inventory) {
          await this.inventoryRepository.createForProduct(
            validation.productId,
            -validation.quantity,
            tx,
          );
        } else {
          await this.inventoryRepository.updateQuantityByProductId(
            validation.productId,
            -validation.quantity,
            tx,
          );
        }
      }

      const order = await this.orderRepository.createWithItems(
        {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          items: productValidations.map((v) => ({
            productId: v.productId,
            quantity: v.quantity,
            priceAtPurchase: v.unitPrice,
          })),
        },
        tx,
      );

      this.logger.log(`Order ${order.id} created successfully with totalAmount ${totalAmount}`);

      return this.mapToOrderResponse(order);
    });
  }

  async findAll(userId: string, userRole: UserRole): Promise<OrderResponseDto[]> {
    let orders;
    
    if (userRole === UserRole.ADMIN) {
      orders = await this.orderRepository.findAllWithItems();
    } else {
      orders = await this.orderRepository.findByUserId(userId);
    }

    return orders.map((order) => this.mapToOrderResponse(order));
  }

  async findOne(id: string, userId: string, userRole: UserRole): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findByIdWithItems(id);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (userRole !== UserRole.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return this.mapToOrderResponse(order);
  }

  async cancelOrder(id: string, userId: string, userRole: UserRole): Promise<OrderResponseDto> {
    this.logger.log(`Cancelling order ${id} by user ${userId}`);

    return this.prisma.$transaction(async (tx) => {
      const order = await this.orderRepository.findByIdWithItems(id, tx);

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      if (userRole !== UserRole.ADMIN && order.userId !== userId) {
        throw new ForbiddenException('You do not have access to this order');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Cannot cancel order with status ${order.status}. Only PENDING orders can be cancelled.`,
        );
      }

      for (const item of order.items) {
        const inventory = await this.inventoryRepository.findByProductId(item.productId, tx);
        
        if (!inventory) {
          await this.inventoryRepository.createForProduct(
            item.productId,
            item.quantity,
            tx,
          );
        } else {
          await this.inventoryRepository.updateQuantityByProductId(
            item.productId,
            item.quantity,
            tx,
          );
        }
      }

      const updatedOrder = await this.orderRepository.updateStatus(
        id,
        OrderStatus.CANCELLED,
        tx,
      );

      const orderWithItems = await this.orderRepository.findByIdWithItems(id, tx);
      if (!orderWithItems) {
        throw new NotFoundException(`Order with ID ${id} not found after update`);
      }

      this.logger.log(`Order ${id} cancelled successfully, stock restored`);

      return this.mapToOrderResponse(orderWithItems);
    });
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    userId: string,
    userRole: UserRole,
  ): Promise<OrderResponseDto> {
    // Seul ADMIN peut modifier le statut (pour l'instant)
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can update order status');
    }

    const order = await this.orderRepository.findByIdWithItems(id);

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const updatedOrder = await this.orderRepository.updateStatus(id, status);

    const orderWithItems = await this.orderRepository.findByIdWithItems(id);
    if (!orderWithItems) {
      throw new NotFoundException(`Order with ID ${id} not found after update`);
    }

    this.logger.log(`Order ${id} status updated to ${status} by admin ${userId}`);

    return this.mapToOrderResponse(orderWithItems);
  }

  private mapToOrderResponse(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      userId: order.userId,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        unitPriceAtPurchase: item.priceAtPurchase,
        subtotal: item.priceAtPurchase * item.quantity,
      })),
    };
  }
}
