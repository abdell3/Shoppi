import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../core/base/base.repository';
import { Prisma, Cart, CartItem, CartStatus } from '@prisma/client';

@Injectable()
export class CartRepository extends BaseRepository<
  Cart,
  Prisma.CartCreateInput,
  Prisma.CartUpdateInput
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.cart);
  }


  async findActiveCartByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart | null> {
    const client = tx ?? this.prisma;
    return client.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
    });
  }

  async findActiveCartByGuestId(
    guestId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart | null> {
    const client = tx ?? this.prisma;
    return client.cart.findFirst({
      where: {
        guestId,
        status: CartStatus.ACTIVE,
      },
    });
  }

  async findById(cartId: string, tx?: Prisma.TransactionClient): Promise<Cart | null> {
    const client = tx ?? this.prisma;
    return client.cart.findUnique({
      where: { id: cartId },
    });
  }

  async createCart(
    data: Prisma.CartUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart> {
    const client = tx ?? this.prisma;
    return client.cart.create({
      data,
    });
  }

  async updateCart(
    cartId: string,
    data: Prisma.CartUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart> {
    const client = tx ?? this.prisma;
    return client.cart.update({
      where: { id: cartId },
      data,
    });
  }

  async updateCartStatus(
    cartId: string,
    status: CartStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Cart> {
    const client = tx ?? this.prisma;
    return client.cart.update({
      where: { id: cartId },
      data: { status },
    });
  }

  async incrementVersion(cartId: string, tx?: Prisma.TransactionClient): Promise<Cart> {
    const client = tx ?? this.prisma;
    return client.cart.update({
      where: { id: cartId },
      data: { version: { increment: 1 } },
    });
  }

  async deleteCart(cartId: string, tx?: Prisma.TransactionClient): Promise<Cart> {
    const client = tx ?? this.prisma;
    return client.cart.delete({
      where: { id: cartId },
    });
  }


  async findItemsByCartId(
    cartId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CartItem[]> {
    const client = tx ?? this.prisma;
    return client.cartItem.findMany({
      where: { cartId },
    });
  }

  async findItem(
    cartId: string,
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CartItem | null> {
    const client = tx ?? this.prisma;
    return client.cartItem.findUnique({
      where: {
        cartId_productId: { cartId, productId },
      },
    });
  }

  async addItem(
    cartId: string,
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<CartItem> {
    const client = tx ?? this.prisma;
    return client.cartItem.upsert({
      where: {
        cartId_productId: { cartId, productId },
      },
      create: {
        cartId,
        productId,
        quantity,
      },
      update: { quantity },
    });
  }

  async updateItemQuantity(
    cartId: string,
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<CartItem> {
    const client = tx ?? this.prisma;
    return client.cartItem.update({
      where: {
        cartId_productId: { cartId, productId },
      },
      data: { quantity },
    });
  }

  async removeItem(
    cartId: string,
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CartItem> {
    const client = tx ?? this.prisma;
    return client.cartItem.delete({
      where: {
        cartId_productId: { cartId, productId },
      },
    });
  }

  async clearCart(cartId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    const result = await client.cartItem.deleteMany({
      where: { cartId },
    });
    return result.count;
  }
}
