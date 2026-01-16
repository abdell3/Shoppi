import { ApiProperty } from '@nestjs/swagger';

type CategoryPersistence = {
  id: string;
  name: string;
  slug: string;
  isHidden?: boolean;
};

export class CategoryEntity {
  @ApiProperty({
    description: 'Category unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  public readonly id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  public readonly name: string;

  @ApiProperty({
    description: 'Category slug (URL-friendly identifier)',
    example: 'electronics',
  })
  public readonly slug: string;

  @ApiProperty({
    description: 'Category active status',
    example: true,
  })
  public readonly isActive: boolean;

  private constructor(
    id: string,
    name: string,
    slug: string,
    isActive: boolean,
  ) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.isActive = isActive;
  }

  static fromPersistence(data: CategoryPersistence): CategoryEntity {
    return new CategoryEntity(
      data.id,
      data.name,
      data.slug,
      data.isHidden === undefined ? true : !data.isHidden,
    );
  }

  static fromPersistenceArray(data: CategoryPersistence[]): CategoryEntity[] {
    return data.map((item) => CategoryEntity.fromPersistence(item));
  }
}
