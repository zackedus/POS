import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductGridQueryDto } from './dto/product-grid-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateProductBundleDto } from './dto/create-product-bundle.dto';
import { UpdateProductBundleDto } from './dto/update-product-bundle.dto';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { ConvertProductQuantityDto } from './dto/convert-product-quantity.dto';
import { UpsertProductBundleOutletPolicyDto } from './dto/upsert-product-bundle-outlet-policy.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('units')
  listUnits(@CurrentUser() user: AuthJwtPayload) {
    return this.catalogService.listUnits(user);
  }

  @Post('units')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createUnit(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateUnitDto) {
    return this.catalogService.createUnit(user, dto);
  }

  @Patch('units/:unitId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateUnit(@CurrentUser() user: AuthJwtPayload, @Param('unitId') unitId: string, @Body() dto: UpdateUnitDto) {
    return this.catalogService.updateUnit(user, unitId, dto);
  }

  @Delete('units/:unitId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteUnit(@CurrentUser() user: AuthJwtPayload, @Param('unitId') unitId: string) {
    return this.catalogService.deleteUnit(user, unitId);
  }

  @Get('categories')
  listCategories(@CurrentUser() user: AuthJwtPayload) {
    return this.catalogService.listCategories(user);
  }

  @Get('categories/summary')
  listCategoriesSummary(@CurrentUser() user: AuthJwtPayload) {
    return this.catalogService.listCategoriesSummary(user);
  }

  @Post('categories')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createCategory(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(user, dto);
  }

  @Patch('categories/:categoryId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateCategory(
    @CurrentUser() user: AuthJwtPayload,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(user, categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteCategory(@CurrentUser() user: AuthJwtPayload, @Param('categoryId') categoryId: string) {
    return this.catalogService.deleteCategory(user, categoryId);
  }

  @Get('products')
  listProducts(@CurrentUser() user: AuthJwtPayload, @Query() query: ListProductsQueryDto) {
    return this.catalogService.listProducts(user, query);
  }

  @Get('products/grid')
  listProductsGrid(@CurrentUser() user: AuthJwtPayload, @Query() query: ProductGridQueryDto) {
    return this.catalogService.listProductsGrid(user, query);
  }

  @Post('products')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createProduct(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(user, dto);
  }

  @Get('products/:productId/variants')
  listProductVariants(@CurrentUser() user: AuthJwtPayload, @Param('productId') productId: string) {
    return this.catalogService.listProductVariants(user, productId);
  }

  @Post('products/:productId/variants')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createProductVariant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.catalogService.createProductVariant(user, productId, dto);
  }

  @Patch('products/:productId/variants/:variantId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateProductVariant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.catalogService.updateProductVariant(user, productId, variantId, dto);
  }

  @Delete('products/:productId/variants/:variantId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteProductVariant(
    @CurrentUser() user: AuthJwtPayload,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.catalogService.deleteProductVariant(user, productId, variantId);
  }

  @Patch('products/:productId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateProduct(
    @CurrentUser() user: AuthJwtPayload,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(user, productId, dto);
  }

  @Delete('products/:productId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteProduct(@CurrentUser() user: AuthJwtPayload, @Param('productId') productId: string) {
    return this.catalogService.deleteProduct(user, productId);
  }

  @Get('products/bundles')
  listProductBundles(@CurrentUser() user: AuthJwtPayload) {
    return this.catalogService.listProductBundles(user);
  }

  @Post('products/bundles')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createProductBundle(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateProductBundleDto) {
    return this.catalogService.createProductBundle(user, dto);
  }

  @Patch('products/bundles/:bundleProductId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateProductBundle(
    @CurrentUser() user: AuthJwtPayload,
    @Param('bundleProductId') bundleProductId: string,
    @Body() dto: UpdateProductBundleDto,
  ) {
    return this.catalogService.updateProductBundle(user, bundleProductId, dto);
  }

  @Delete('products/bundles/:bundleProductId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteProductBundle(@CurrentUser() user: AuthJwtPayload, @Param('bundleProductId') bundleProductId: string) {
    return this.catalogService.deleteProductBundle(user, bundleProductId);
  }

  @Post('products/bundles/outlet-policy')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  upsertProductBundleOutletPolicy(@CurrentUser() user: AuthJwtPayload, @Body() dto: UpsertProductBundleOutletPolicyDto) {
    return this.catalogService.upsertProductBundleOutletPolicy(user, dto);
  }

  @Get('products/unit-conversions')
  listProductUnitConversions(@CurrentUser() user: AuthJwtPayload, @Query('productId') productId?: string) {
    return this.catalogService.listProductUnitConversions(user, productId);
  }

  @Post('products/unit-conversions')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createProductUnitConversion(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateProductUnitConversionDto) {
    return this.catalogService.createProductUnitConversion(user, dto);
  }

  @Post('products/unit-conversions/convert')
  convertProductQuantity(@CurrentUser() user: AuthJwtPayload, @Body() dto: ConvertProductQuantityDto) {
    return this.catalogService.convertProductQuantity(user, dto);
  }
}
