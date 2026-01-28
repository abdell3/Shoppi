import { Module, forwardRef, Logger } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => CatalogModule),
    forwardRef(() => InventoryModule),
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, Logger],
  exports: [OrdersService],
})
export class OrdersModule {}
