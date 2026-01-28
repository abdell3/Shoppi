import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<{ user?: { userId: string } }>();
    const user = req.user;
    if (!user?.userId) return undefined;
    return { id: user.userId };
  },
);
