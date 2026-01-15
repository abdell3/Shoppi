import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  name!: string;

  @ApiProperty({ example: 'Latest iPhone with advanced features' })
  description!: string;

  @ApiProperty({ example: 999.99 })
  price!: number;

  @ApiProperty({ example: 'electronics', nullable: true })
  category!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class ProductsMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class ProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty({ type: ProductsMetaDto })
  meta!: ProductsMetaDto;
}
