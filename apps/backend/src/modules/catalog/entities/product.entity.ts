import { ApiProperty } from '@nestjs/swagger';

type ProductPersistence = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isHidden: boolean;
  categorySlug?: string | null;
};

export class ProductEntity {
  @ApiProperty({
    description: 'Product unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  public readonly id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 15 Pro',
  })
  public readonly name: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Latest iPhone with advanced features and titanium design',
  })
  public readonly description: string;

  @ApiProperty({
    description: 'Product price in currency unit',
    example: 999.99,
  })
  public readonly price: number;

  @ApiProperty({
    description: 'Product category slug',
    example: 'electronics',
    nullable: true,
  })
  public readonly category: string | null;

  @ApiProperty({
    description: 'Product active status',
    example: true,
  })
  public readonly isActive: boolean;

  private constructor(
    id: string,
    name: string,
    description: string,
    price: number,
    category: string | null,
    isActive: boolean,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.isActive = isActive;
  }

  static fromPersistence(data: ProductPersistence): ProductEntity {
    return new ProductEntity(
      data.id,
      data.name,
      data.description,
      data.price,
      data.categorySlug ?? null,
      !data.isHidden,
    );
  }

  static fromPersistenceArray(data: ProductPersistence[]): ProductEntity[] {
    return data.map((item) => ProductEntity.fromPersistence(item));
  }
}