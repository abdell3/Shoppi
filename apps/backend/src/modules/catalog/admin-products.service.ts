import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './entities/product.entity';

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductEntity> {
    if (!createProductDto.categoryId) {
      throw new NotFoundException(`Category ID is required`);
    }

    const category = await this.categoryRepository.findById(createProductDto.categoryId);

    if (!category) {
      throw new NotFoundException(`Category with ID ${createProductDto.categoryId} not found`);
    }

    const sku = await this.productRepository.generateUniqueSku(createProductDto.name);

    const product = await this.productRepository.create({
      name: createProductDto.name,
      description: createProductDto.description,
      price: createProductDto.price,
      sku,
      isHidden: false,
      category: {
        connect: { id: createProductDto.categoryId },
      },
    });

    return ProductEntity.fromPersistence({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      isHidden: product.isHidden,
      categorySlug: category.slug,
    });
  }

  async findAll(): Promise<ProductEntity[]> {
    const products = await this.productRepository.findAllAdmin();
    return products.map((product) =>
      ProductEntity.fromPersistence({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        categoryId: product.categoryId,
        isHidden: product.isHidden,
        categorySlug: product.category?.slug ?? null,
      }),
    );
  }

  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return ProductEntity.fromPersistence({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      isHidden: product.isHidden,
      categorySlug: product.category?.slug ?? null,
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductEntity> {
    const existingProduct = await this.productRepository.findById(id);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updateData: {
      name?: string;
      description?: string;
      price?: number;
      isHidden?: boolean;
      category?: { connect: { id: string } };
    } = {};

    if (updateProductDto.name !== undefined) {
      updateData.name = updateProductDto.name;
    }
    if (updateProductDto.description !== undefined) {
      updateData.description = updateProductDto.description;
    }
    if (updateProductDto.price !== undefined) {
      updateData.price = updateProductDto.price;
    }
    if (updateProductDto.isHidden !== undefined) {
      updateData.isHidden = updateProductDto.isHidden;
    }
    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findById(updateProductDto.categoryId);

      if (!category) {
        throw new BadRequestException(`Category with ID ${updateProductDto.categoryId} not found`);
      }

      updateData.category = {
        connect: { id: updateProductDto.categoryId },
      };
    }

    const updatedProduct = await this.productRepository.update(id, updateData);
    
    const productWithCategory = await this.productRepository.findById(id);
    if (!productWithCategory) {
      throw new NotFoundException(`Product with ID ${id} not found after update`);
    }

    return ProductEntity.fromPersistence({
      id: productWithCategory.id,
      name: productWithCategory.name,
      description: productWithCategory.description,
      price: productWithCategory.price,
      categoryId: productWithCategory.categoryId,
      isHidden: productWithCategory.isHidden,
      categorySlug: productWithCategory.category?.slug ?? null,
    });
  }

  async remove(id: string): Promise<ProductEntity> {
    const existingProduct = await this.productRepository.findById(id);

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const softDeletedProduct = await this.productRepository.softDelete(id);
    
    const productWithCategory = await this.productRepository.findById(id);
    if (!productWithCategory) {
      throw new NotFoundException(`Product with ID ${id} not found after soft delete`);
    }

    return ProductEntity.fromPersistence({
      id: productWithCategory.id,
      name: productWithCategory.name,
      description: productWithCategory.description,
      price: productWithCategory.price,
      categoryId: productWithCategory.categoryId,
      isHidden: productWithCategory.isHidden,
      categorySlug: productWithCategory.category?.slug ?? null,
    });
  }
}
