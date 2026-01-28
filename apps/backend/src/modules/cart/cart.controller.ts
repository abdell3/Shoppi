import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService, CartWithItems } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RemoveCartItemDto } from './dto/remove-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { JwtOptionalGuard } from './guards/jwt-optional.guard';
import { GuestGuard } from './guards/guest.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { GuestId } from './decorators/guest-id.decorator';
import { Cart } from '@prisma/client';

const X_GUEST_ID = 'x-guest-id';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Get or create active cart' })
  @ApiBearerAuth()
  @ApiHeader({ name: X_GUEST_ID, required: false, description: 'Guest cart ID (when not authenticated)' })
  @ApiResponse({ status: 200, description: 'Active cart' })
  @ApiResponse({ status: 201, description: 'Cart created' })
  @ApiResponse({ status: 401, description: 'Provide JWT or X-Guest-Id' })
  @Get('active')
  @UseGuards(JwtOptionalGuard, GuestGuard)
  @HttpCode(HttpStatus.OK)
  async getOrCreateActive(
    @CurrentUser() user: { id: string } | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<Cart> {
    const userId = user?.id;
    if (userId) return this.cartService.getOrCreateActiveCart({ userId });
    if (guestId) return this.cartService.getOrCreateActiveCart({ guestId });
    throw new UnauthorizedException('Provide JWT or X-Guest-Id header');
  }

  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiBearerAuth()
  @ApiHeader({ name: X_GUEST_ID, required: false })
  @ApiParam({ name: 'cartId', description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  @Get(':cartId')
  @UseGuards(JwtOptionalGuard, GuestGuard)
  @HttpCode(HttpStatus.OK)
  async getCart(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @CurrentUser() user: { id: string } | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<CartWithItems> {
    this.ensureIdentity(user, guestId);
    const cart = await this.cartService.getCart(cartId);
    this.assertOwnership(cart, user?.id, guestId);
    return cart;
  }

  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBearerAuth()
  @ApiHeader({ name: X_GUEST_ID, required: false })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Cart or product not found' })
  @ApiResponse({ status: 409, description: 'Concurrent modification' })
  @Post('items')
  @UseGuards(JwtOptionalGuard, GuestGuard)
  @HttpCode(HttpStatus.OK)
  async addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() user: { id: string } | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<CartWithItems> {
    this.ensureIdentity(user, guestId);
    const cart = await this.cartService.getCart(dto.cartId);
    this.assertOwnership(cart, user?.id, guestId);
    return this.cartService.addItem({
      cartId: dto.cartId,
      productId: dto.productId,
      quantity: dto.quantity,
    });
  }

  @ApiOperation({ summary: 'Update item quantity' })
  @ApiBearerAuth()
  @ApiHeader({ name: X_GUEST_ID, required: false })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  @ApiResponse({ status: 409, description: 'Concurrent modification' })
  @Patch('items')
  @UseGuards(JwtOptionalGuard, GuestGuard)
  @HttpCode(HttpStatus.OK)
  async updateItemQuantity(
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: { id: string } | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<CartWithItems> {
    this.ensureIdentity(user, guestId);
    const cart = await this.cartService.getCart(dto.cartId);
    this.assertOwnership(cart, user?.id, guestId);
    return this.cartService.updateItemQuantity({
      cartId: dto.cartId,
      productId: dto.productId,
      quantity: dto.quantity,
    });
  }

  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiBearerAuth()
  @ApiHeader({ name: X_GUEST_ID, required: false })
  @ApiResponse({ status: 200, description: 'Cart with items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  @ApiResponse({ status: 409, description: 'Concurrent modification' })
  @Delete('items')
  @UseGuards(JwtOptionalGuard, GuestGuard)
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Body() dto: RemoveCartItemDto,
    @CurrentUser() user: { id: string } | undefined,
    @GuestId() guestId: string | undefined,
  ): Promise<CartWithItems> {
    this.ensureIdentity(user, guestId);
    const cart = await this.cartService.getCart(dto.cartId);
    this.assertOwnership(cart, user?.id, guestId);
    return this.cartService.removeItem({
      cartId: dto.cartId,
      productId: dto.productId,
    });
  }

  @ApiOperation({ summary: 'Merge guest cart into user cart' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'User cart with merged items' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Concurrent modification' })
  @Post('merge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async merge(
    @Body() dto: MergeCartDto,
    @CurrentUser() user: { id: string },
  ): Promise<CartWithItems> {
    if (!user?.id) throw new UnauthorizedException('JWT required');
    return this.cartService.mergeGuestCart({
      guestId: dto.guestId,
      userId: user.id,
    });
  }

  private ensureIdentity(
    user: { id: string } | undefined,
    guestId: string | undefined,
  ): void {
    if (user?.id || (typeof guestId === 'string' && guestId.trim() !== ''))
      return;
    throw new UnauthorizedException('Provide JWT or X-Guest-Id header');
  }

  private assertOwnership(
    cart: { userId: string | null; guestId: string | null },
    userId: string | undefined,
    guestId: string | undefined,
  ): void {
    const byUser = userId && cart.userId === userId;
    const byGuest = guestId && cart.guestId === guestId;
    if (byUser || byGuest) return;
    throw new ForbiddenException('You do not own this cart');
  }
}
