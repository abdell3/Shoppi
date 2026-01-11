import { Product } from '@prisma/client';

type ProductWithRelations = Product & {
  category?: { slug?: string; name?: string } | null;
  inventory?: { availableQuantity?: number } | null;
};

export class ProductEntity {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly price: number,
    public readonly category?: string,
    public readonly isAvailable: boolean,
  ) {}

  static fromPrisma(product: ProductWithRelations): ProductEntity {
    const category = product.category?.slug || product.category?.name || undefined;
    const isAvailable = product.inventory 
      ? (product.inventory.availableQuantity ?? 0) > 0
      : true;

    return new ProductEntity(
      product.id,
      product.name,
      product.description,
      product.price,
      category,
      isAvailable,
    );
  }

  static fromPrismaArray(products: Product[]): ProductEntity[] {
    return products.map((product) => ProductEntity.fromPrisma(product as ProductWithRelations));
  }
}
