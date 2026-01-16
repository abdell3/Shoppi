import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController, AdminProductsController],
  providers: [CatalogService, AdminProductsService, ProductRepository, CategoryRepository],
  exports: [ProductRepository, CategoryRepository],
})
export class CatalogModule {}
