import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Attaches storefront customer JWT when present; does not reject anonymous requests. */
@Injectable()
export class OptionalStorefrontCustomerAuthGuard extends AuthGuard('storefront-customer-jwt') {
  handleRequest<T>(_err: unknown, user: T): T {
    return user ?? (null as T);
  }
}
