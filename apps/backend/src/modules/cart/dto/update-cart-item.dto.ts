import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Cart ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  cartId!: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}
