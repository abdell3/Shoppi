type ProductPersistence = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  isHidden: boolean;
};

export class ProductEntity {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly category: string | null,
    public readonly isActive: boolean,
  ) {}

  static fromPersistence(data: ProductPersistence): ProductEntity {
    return new ProductEntity(
      data.id,
      data.name,
      data.description,
      data.price,
      null,
      !data.isHidden,
    );
  }

  static fromPersistenceArray(data: ProductPersistence[]): ProductEntity[] {
    return data.map((item) => ProductEntity.fromPersistence(item));
  }
}