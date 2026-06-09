import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import {
  CatalogCategoriesQueryDto,
  CatalogProductDetailQueryDto,
  CatalogProductsQueryDto,
} from './dto/catalog-products-query.dto';
import { OrderStatusQueryDto } from './dto/order-status-query.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { CurrentStorefrontCustomer } from './storefront-customer-auth.decorator';
import { OptionalStorefrontCustomerAuthGuard } from './optional-storefront-customer-auth.guard';
import { StorefrontRateLimitGuard } from './storefront-rate-limit.guard';
import { StorefrontService } from './storefront.service';
import type { StorefrontCustomerJwtPayload } from './storefront-customer-auth.types';

@Controller('store/:tenantSlug')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('config')
  getConfig(@Param('tenantSlug') tenantSlug: string) {
    return this.storefrontService.getConfig(tenantSlug);
  }

  @Get('outlets')
  listOutlets(@Param('tenantSlug') tenantSlug: string) {
    return this.storefrontService.listOutlets(tenantSlug);
  }

  @Get('catalog/categories')
  listCategories(
    @Param('tenantSlug') tenantSlug: string,
    @Query() query: CatalogCategoriesQueryDto,
  ) {
    return this.storefrontService.listCategories(tenantSlug, query.outletId);
  }

  @Get('catalog/products')
  listProducts(
    @Param('tenantSlug') tenantSlug: string,
    @Query() query: CatalogProductsQueryDto,
  ) {
    return this.storefrontService.listProducts(tenantSlug, query);
  }

  @Get('catalog/products/:productId')
  getProduct(
    @Param('tenantSlug') tenantSlug: string,
    @Param('productId') productId: string,
    @Query() query: CatalogProductDetailQueryDto,
  ) {
    return this.storefrontService.getProduct(tenantSlug, productId, query.outletId);
  }

  @Post('orders')
  @UseGuards(StorefrontRateLimitGuard, OptionalStorefrontCustomerAuthGuard)
  createOrder(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: CreateOnlineOrderDto,
    @CurrentStorefrontCustomer() customer?: StorefrontCustomerJwtPayload,
  ) {
    return this.storefrontService.createOrder(tenantSlug, dto, customer ?? null);
  }

  @Post('orders/:orderNo/mock-pay')
  confirmMockPayment(
    @Param('tenantSlug') tenantSlug: string,
    @Param('orderNo') orderNo: string,
    @Body() body: OrderStatusQueryDto,
  ) {
    return this.storefrontService.confirmMockPayment(tenantSlug, orderNo, body.phone);
  }

  @Get('orders/:orderNo/status')
  getOrderStatus(
    @Param('tenantSlug') tenantSlug: string,
    @Param('orderNo') orderNo: string,
    @Query() query: OrderStatusQueryDto,
  ) {
    return this.storefrontService.getOrderStatus(tenantSlug, orderNo, query.phone);
  }

  @Post('orders/:orderNo/retry-payment')
  retryPayment(
    @Param('tenantSlug') tenantSlug: string,
    @Param('orderNo') orderNo: string,
    @Body() body: OrderStatusQueryDto,
  ) {
    return this.storefrontService.retryPayment(tenantSlug, orderNo, body.phone);
  }

  @Post('register')
  @UseGuards(StorefrontRateLimitGuard)
  registerMember(@Param('tenantSlug') tenantSlug: string, @Body() dto: RegisterCustomerDto) {
    if (dto.website?.trim()) {
      return { ok: true, message: 'Terima kasih.' };
    }
    return this.storefrontService.registerMember(tenantSlug, dto);
  }
}
