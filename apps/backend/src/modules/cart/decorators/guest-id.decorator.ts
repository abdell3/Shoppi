import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const X_GUEST_ID = 'x-guest-id';

export const GuestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const v = req.headers[X_GUEST_ID];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
    return undefined;
  },
);
