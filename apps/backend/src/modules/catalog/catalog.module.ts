import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { ProductRepository } from './repositories/product.repository';

@Module({
  controllers: [CatalogController],
  providers: [ProductRepository],
  exports: [ProductRepository],
})
export class CatalogModule {}
