import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class StorefrontCustomerAuthGuard extends AuthGuard('storefront-customer-jwt') {}
