import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CartRepository } from './repositories/cart.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { InventoryRepository } from '../inventory/repositories/inventory.repository';
import { Cart, CartItem, CartStatus, Product } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type CartWithItems = Cart & {
  items: (CartItem & { product: Product })[];
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: Logger,
  ) {}

  async getOrCreateActiveCart(params: {
    userId?: string;
    guestId?: string;
  }): Promise<Cart> {
    const { userId, guestId } = params;
    const hasUser = userId != null && userId !== '';
    const hasGuest = guestId != null && guestId !== '';
    if (hasUser === hasGuest) {
      throw new BadRequestException(
        'Exactly one of userId or guestId must be provided',
      );
    }

    const existing = hasUser
      ? await this.cartRepository.findActiveCartByUserId(userId!)
      : await this.cartRepository.findActiveCartByGuestId(guestId!);
    if (existing) return existing;

    try {
      const data: Prisma.CartUncheckedCreateInput = hasUser
        ? { userId: userId!, guestId: null }
        : { userId: null, guestId: guestId! };
      return await this.cartRepository.createCart(data);
    } catch (e: unknown) {
      if (isP2002(e)) {
        this.logger.warn(
          `Cart create race (unique ACTIVE per owner): retrying find. Owner: ${hasUser ? `userId=${userId}` : `guestId=${guestId}`}`,
        );
        const retry = hasUser
          ? await this.cartRepository.findActiveCartByUserId(userId!)
          : await this.cartRepository.findActiveCartByGuestId(guestId!);
        if (retry) return retry;
      }
      throw e;
    }
  }

  async getCart(cartId: string): Promise<CartWithItems> {
    const cart = await this.cartRepository.findById(cartId);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }
    if (cart.status !== CartStatus.ACTIVE) {
      throw new NotFoundException(
        `Cart with ID ${cartId} is not active (status: ${cart.status})`,
      );
    }
    return this.loadCartWithItems(cartId);
  }

  async addItem(params: {
    cartId: string;
    productId: string;
    quantity: number;
  }): Promise<CartWithItems> {
    const { cartId, productId, quantity } = params;
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    return this.prisma.executeTransaction(async (tx) => {
      const cart = await this.cartRepository.findById(cartId, tx);
      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }
      if (cart.status !== CartStatus.ACTIVE) {
        throw new NotFoundException(
          `Cart with ID ${cartId} is not active (status: ${cart.status})`,
        );
      }

      const product = await this.productRepository.findById(productId, tx);
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      if (product.isHidden) {
        throw new BadRequestException(
          `Product with ID ${productId} is not available`,
        );
      }

      const inv = await this.inventoryRepository.findByProductId(productId, tx);
      const available = inv?.quantity ?? 0;

      const existing = await this.cartRepository.findItem(
        cartId,
        productId,
        tx,
      );
      const newQty = existing ? existing.quantity + quantity : quantity;
      if (available < newQty) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${available}, Requested: ${newQty}`,
        );
      }

      if (existing) {
        await this.cartRepository.updateItemQuantity(
          cartId,
          productId,
          newQty,
          tx,
        );
      } else {
        await this.cartRepository.addItem(cartId, productId, quantity, tx);
      }

      const bumped = await this.bumpVersionIfMatch(cartId, cart.version, tx);
      if (!bumped) {
        this.logger.warn(
          `Optimistic lock conflict on cart ${cartId} (addItem); version=${cart.version}`,
        );
        throw new ConflictException(
          'Cart was modified concurrently; please retry',
        );
      }

      return this.loadCartWithItems(cartId, tx);
    });
  }

  async updateItemQuantity(params: {
    cartId: string;
    productId: string;
    quantity: number;
  }): Promise<CartWithItems> {
    const { cartId, productId, quantity } = params;
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    return this.prisma.executeTransaction(async (tx) => {
      const cart = await this.cartRepository.findById(cartId, tx);
      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }
      if (cart.status !== CartStatus.ACTIVE) {
        throw new NotFoundException(
          `Cart with ID ${cartId} is not active (status: ${cart.status})`,
        );
      }

      const item = await this.cartRepository.findItem(cartId, productId, tx);
      if (!item) {
        throw new NotFoundException(
          `Cart item not found for product ${productId} in cart ${cartId}`,
        );
      }

      const product = await this.productRepository.findById(productId, tx);
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }
      if (product.isHidden) {
        throw new BadRequestException(
          `Product with ID ${productId} is not available`,
        );
      }

      const inv = await this.inventoryRepository.findByProductId(productId, tx);
      const available = inv?.quantity ?? 0;
      if (available < quantity) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.name}. Available: ${available}, Requested: ${quantity}`,
        );
      }

      await this.cartRepository.updateItemQuantity(
        cartId,
        productId,
        quantity,
        tx,
      );

      const bumped = await this.bumpVersionIfMatch(cartId, cart.version, tx);
      if (!bumped) {
        this.logger.warn(
          `Optimistic lock conflict on cart ${cartId} (updateItemQuantity); version=${cart.version}`,
        );
        throw new ConflictException(
          'Cart was modified concurrently; please retry',
        );
      }

      return this.loadCartWithItems(cartId, tx);
    });
  }

  async removeItem(params: {
    cartId: string;
    productId: string;
  }): Promise<CartWithItems> {
    const { cartId, productId } = params;

    return this.prisma.executeTransaction(async (tx) => {
      const cart = await this.cartRepository.findById(cartId, tx);
      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }
      if (cart.status !== CartStatus.ACTIVE) {
        throw new NotFoundException(
          `Cart with ID ${cartId} is not active (status: ${cart.status})`,
        );
      }

      const item = await this.cartRepository.findItem(cartId, productId, tx);
      if (!item) {
        throw new NotFoundException(
          `Cart item not found for product ${productId} in cart ${cartId}`,
        );
      }

      await this.cartRepository.removeItem(cartId, productId, tx);

      const bumped = await this.bumpVersionIfMatch(cartId, cart.version, tx);
      if (!bumped) {
        this.logger.warn(
          `Optimistic lock conflict on cart ${cartId} (removeItem); version=${cart.version}`,
        );
        throw new ConflictException(
          'Cart was modified concurrently; please retry',
        );
      }

      return this.loadCartWithItems(cartId, tx);
    });
  }

  async mergeGuestCart(params: {
    guestId: string;
    userId: string;
  }): Promise<CartWithItems> {
    const { guestId, userId } = params;

    return this.prisma.executeTransaction(async (tx) => {
      const guestCart = await this.cartRepository.findActiveCartByGuestId(
        guestId,
        tx,
      );
      let userCart =
        await this.cartRepository.findActiveCartByUserId(userId, tx);
      if (!userCart) {
        userCart = await this.cartRepository.createCart(
          { userId, guestId: null },
          tx,
        );
      }

      if (!guestCart) {
        return this.loadCartWithItems(userCart.id, tx);
      }

      const guestItems = await this.cartRepository.findItemsByCartId(
        guestCart.id,
        tx,
      );
      for (const gi of guestItems) {
        const existing = await this.cartRepository.findItem(
          userCart!.id,
          gi.productId,
          tx,
        );
        const newQty = existing ? existing.quantity + gi.quantity : gi.quantity;

        const inv = await this.inventoryRepository.findByProductId(
          gi.productId,
          tx,
        );
        const available = inv?.quantity ?? 0;
        if (available < newQty) {
          throw new BadRequestException(
            `Insufficient stock to merge guest cart: product ${gi.productId} would require ${newQty}, available ${available}`,
          );
        }

        await this.cartRepository.addItem(
          userCart!.id,
          gi.productId,
          newQty,
          tx,
        );
      }

      await this.cartRepository.deleteCart(guestCart.id, tx);

      const bumped = await this.bumpVersionIfMatch(
        userCart!.id,
        userCart!.version,
        tx,
      );
      if (!bumped) {
        this.logger.warn(
          `Optimistic lock conflict on cart ${userCart!.id} (mergeGuestCart); version=${userCart!.version}`,
        );
        throw new ConflictException(
          'Cart was modified concurrently; please retry',
        );
      }

      return this.loadCartWithItems(userCart!.id, tx);
    });
  }

  private async loadCartWithItems(
    cartId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CartWithItems> {
    const cart = await this.cartRepository.findById(cartId, tx);
    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }
    const items = await this.cartRepository.findItemsByCartId(cartId, tx);
    const withProduct: (CartItem & { product: Product })[] = await Promise.all(
      items.map(async (item) => {
        const product = await this.productRepository.findById(
          item.productId,
          tx,
        );
        if (!product) {
          throw new NotFoundException(
            `Product ${item.productId} not found for cart item`,
          );
        }
        return { ...item, product };
      }),
    );
    return { ...cart, items: withProduct };
  }

  private async bumpVersionIfMatch(
    cartId: string,
    expectedVersion: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const res = await tx.cart.updateMany({
      where: { id: cartId, version: expectedVersion },
      data: { version: { increment: 1 } },
    });
    return res.count > 0;
  }
}

function isP2002(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e != null &&
    'code' in e &&
    (e as { code: string }).code === 'P2002'
  );
}
