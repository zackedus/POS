import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { StorefrontCustomerJwtPayload } from './storefront-customer-auth.types';

export const CurrentStorefrontCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StorefrontCustomerJwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: StorefrontCustomerJwtPayload }>();
    const user = request.user;
    if (user?.kind === 'storefront_customer') return user;
    return undefined;
  },
);
