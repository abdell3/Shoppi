import { Module, forwardRef, Logger } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartRepository } from './repositories/cart.repository';
import { JwtOptionalGuard } from './guards/jwt-optional.guard';
import { GuestGuard } from './guards/guest.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => CatalogModule),
    forwardRef(() => InventoryModule),
    AuthModule,
  ],
  controllers: [CartController],
  providers: [CartService, CartRepository, Logger, JwtOptionalGuard, GuestGuard],
  exports: [CartService, CartRepository],
})
export class CartModule {}
