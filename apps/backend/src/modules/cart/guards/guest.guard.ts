import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

const X_GUEST_ID = 'x-guest-id';

@Injectable()
export class GuestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.user) return true;
    const guestId = req.headers[X_GUEST_ID];
    if (typeof guestId === 'string' && guestId.trim() !== '') return true;
    throw new UnauthorizedException('Provide JWT or X-Guest-Id header');
  }
}
