import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateCustomerAddressDto, UpdateCustomerAddressDto } from '../customers/dto/customer-address.dto';
import { StorefrontRateLimitGuard } from './storefront-rate-limit.guard';
import { CurrentStorefrontCustomer } from './storefront-customer-auth.decorator';
import { StorefrontCustomerAuthGuard } from './storefront-customer-auth.guard';
import { StorefrontCustomerAuthService } from './storefront-customer-auth.service';
import type { StorefrontCustomerJwtPayload } from './storefront-customer-auth.types';
import {
  StorefrontCustomerLoginDto,
  StorefrontCustomerRegisterDto,
  StorefrontCustomerUpdateProfileDto,
} from './dto/storefront-customer-auth.dto';

@Controller('store/:tenantSlug/customers')
export class StorefrontCustomerController {
  constructor(private readonly authService: StorefrontCustomerAuthService) {}

  @Post('register')
  @UseGuards(StorefrontRateLimitGuard)
  register(@Param('tenantSlug') tenantSlug: string, @Body() dto: StorefrontCustomerRegisterDto) {
    if (dto.website?.trim()) {
      return { ok: true, message: 'Terima kasih.' };
    }
    return this.authService.register(tenantSlug, dto);
  }

  @Post('login')
  @UseGuards(StorefrontRateLimitGuard)
  login(@Param('tenantSlug') tenantSlug: string, @Body() dto: StorefrontCustomerLoginDto) {
    return this.authService.login(tenantSlug, dto);
  }

  @Get('me')
  @UseGuards(StorefrontCustomerAuthGuard)
  getMe(
    @Param('tenantSlug') tenantSlug: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
  ) {
    return this.authService.getMe(customer, tenantSlug);
  }

  @Patch('me')
  @UseGuards(StorefrontCustomerAuthGuard)
  updateMe(
    @Param('tenantSlug') tenantSlug: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
    @Body() dto: StorefrontCustomerUpdateProfileDto,
  ) {
    return this.authService.updateMe(customer, tenantSlug, dto);
  }

  @Get('me/addresses')
  @UseGuards(StorefrontCustomerAuthGuard)
  listAddresses(
    @Param('tenantSlug') tenantSlug: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
  ) {
    return this.authService.listAddresses(customer, tenantSlug);
  }

  @Post('me/addresses')
  @UseGuards(StorefrontCustomerAuthGuard)
  createAddress(
    @Param('tenantSlug') tenantSlug: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.authService.createAddress(customer, tenantSlug, dto);
  }

  @Patch('me/addresses/:addressId')
  @UseGuards(StorefrontCustomerAuthGuard)
  updateAddress(
    @Param('tenantSlug') tenantSlug: string,
    @Param('addressId') addressId: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.authService.updateAddress(customer, tenantSlug, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  @UseGuards(StorefrontCustomerAuthGuard)
  deleteAddress(
    @Param('tenantSlug') tenantSlug: string,
    @Param('addressId') addressId: string,
    @CurrentStorefrontCustomer() customer: StorefrontCustomerJwtPayload,
  ) {
    return this.authService.deleteAddress(customer, tenantSlug, addressId);
  }
}
