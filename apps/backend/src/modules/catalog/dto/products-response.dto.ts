import { ApiProperty } from '@nestjs/swagger';
import { ProductEntity } from '../entities/product.entity';

export class ProductsMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of products',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages!: number;
}

export class ProductsResponseDto {
  @ApiProperty({
    description: 'List of products',
    type: [ProductEntity],
  })
  items!: ProductEntity[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: ProductsMetaDto,
  })
  meta!: ProductsMetaDto;
}
