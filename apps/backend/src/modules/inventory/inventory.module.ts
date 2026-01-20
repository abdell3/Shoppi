import { Module, forwardRef, Logger } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './repositories/inventory.repository';
import { CatalogModule } from '../catalog/catalog.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => CatalogModule), AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, Logger],
})
export class InventoryModule {}
