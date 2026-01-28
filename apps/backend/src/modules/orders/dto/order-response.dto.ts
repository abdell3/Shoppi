import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item ID' })
  id!: string;

  @ApiProperty({ description: 'Product ID' })
  productId!: string;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiProperty({ description: 'Product SKU' })
  productSku!: string;

  @ApiProperty({ description: 'Quantity ordered' })
  quantity!: number;

  @ApiProperty({ description: 'Unit price at purchase time (snapshot)' })
  unitPriceAtPurchase!: number;

  @ApiProperty({ description: 'Subtotal for this item (unitPriceAtPurchase * quantity)' })
  subtotal!: number;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id!: string;

  @ApiProperty({ description: 'Total amount (including tax)' })
  totalAmount!: number;

  @ApiProperty({ description: 'Order status', enum: ['PENDING', 'PAID', 'CANCELLED'] })
  status!: string;

  @ApiProperty({ description: 'Order creation date' })
  createdAt!: Date;

  @ApiProperty({ description: 'User ID who created the order' })
  userId!: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];
}
