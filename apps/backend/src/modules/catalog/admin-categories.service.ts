import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryEntity> {
    const existingCategory = await this.categoryRepository.findBySlug(createCategoryDto.slug);

    if (existingCategory) {
      throw new ConflictException(`Category with slug '${createCategoryDto.slug}' already exists`);
    }

    const category = await this.categoryRepository.create({
      name: createCategoryDto.name,
      slug: createCategoryDto.slug,
      isHidden: false,
    });

    return CategoryEntity.fromPersistence(category);
  }

  async findAll(): Promise<CategoryEntity[]> {
    const categories = await this.categoryRepository.findAllAdmin();
    return CategoryEntity.fromPersistenceArray(categories);
  }

  async findOne(id: string): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return CategoryEntity.fromPersistence(category);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryEntity> {
    const existingCategory = await this.categoryRepository.findById(id);

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== existingCategory.slug) {
      const slugExists = await this.categoryRepository.findBySlug(updateCategoryDto.slug);

      if (slugExists) {
        throw new ConflictException(`Category with slug '${updateCategoryDto.slug}' already exists`);
      }
    }

    const updateData: {
      name?: string;
      slug?: string;
      isHidden?: boolean;
    } = {};

    if (updateCategoryDto.name !== undefined) {
      updateData.name = updateCategoryDto.name;
    }
    if (updateCategoryDto.slug !== undefined) {
      updateData.slug = updateCategoryDto.slug;
    }
    if (updateCategoryDto.isHidden !== undefined) {
      updateData.isHidden = updateCategoryDto.isHidden;
    }

    const updatedCategory = await this.categoryRepository.update(id, updateData);
    return CategoryEntity.fromPersistence(updatedCategory);
  }

  async remove(id: string): Promise<CategoryEntity> {
    const existingCategory = await this.categoryRepository.findById(id);

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const softDeletedCategory = await this.categoryRepository.softDelete(id);
    return CategoryEntity.fromPersistence(softDeletedCategory);
  }
}
