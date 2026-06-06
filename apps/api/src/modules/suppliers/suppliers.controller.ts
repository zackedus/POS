import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { UserRole } from '@barokah/database';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { RolesGuard } from '../../common/guards/roles.guard';

import type { AuthJwtPayload } from '../auth/auth.types';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

import { CreatePurchaseOrderReturnDto } from './dto/create-purchase-order-return.dto';

import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';

import { PurchaseHistoryQueryDto } from './dto/purchase-history-query.dto';

import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';

import { ReceivePurchaseDto } from './dto/receive-purchase.dto';

import { CreateSupplierDto } from './dto/create-supplier.dto';

import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

import { UpdateSupplierDto } from './dto/update-supplier.dto';

import { PurchaseOrdersService } from './purchase-orders.service';

import { SuppliersService } from './suppliers.service';



@Controller()

@UseGuards(JwtAuthGuard, RolesGuard)

@Roles(UserRole.OWNER, UserRole.MANAGER)

export class SuppliersController {

  constructor(

    private readonly suppliersService: SuppliersService,

    private readonly purchaseOrdersService: PurchaseOrdersService,

  ) {}



  @Get('suppliers')

  listSuppliers(@CurrentUser() user: AuthJwtPayload) {

    return this.suppliersService.listSuppliers(user);

  }



  @Post('suppliers')

  createSupplier(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateSupplierDto) {

    return this.suppliersService.createSupplier(user, dto);

  }



  @Patch('suppliers/:supplierId')

  updateSupplier(

    @CurrentUser() user: AuthJwtPayload,

    @Param('supplierId') supplierId: string,

    @Body() dto: UpdateSupplierDto,

  ) {

    return this.suppliersService.updateSupplier(user, supplierId, dto);

  }



  @Get('purchase-orders')

  listPurchaseOrders(@CurrentUser() user: AuthJwtPayload, @Query() query: ListPurchaseOrdersQueryDto) {

    return this.purchaseOrdersService.listPurchaseOrders(user, query);

  }



  @Post('purchase-orders')

  createPurchaseOrder(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreatePurchaseOrderDto) {

    return this.purchaseOrdersService.createPurchaseOrder(user, dto);

  }



  @Get('purchase-orders/receives')

  listPurchaseReceives(@CurrentUser() user: AuthJwtPayload, @Query() query: PurchaseHistoryQueryDto) {

    return this.suppliersService.listPurchaseReceives(user, query);

  }



  @Get('purchase-order-returns/:returnId')

  getPurchaseOrderReturn(

    @CurrentUser() user: AuthJwtPayload,

    @Param('returnId') returnId: string,

  ) {

    return this.purchaseOrdersService.getPurchaseOrderReturn(user, returnId);

  }



  @Get('purchase-orders/:purchaseOrderId/returns')

  listPurchaseOrderReturns(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

  ) {

    return this.purchaseOrdersService.listPurchaseOrderReturns(user, purchaseOrderId);

  }



  @Post('purchase-orders/:purchaseOrderId/returns')

  createPurchaseOrderReturn(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

    @Body() dto: CreatePurchaseOrderReturnDto,

  ) {

    return this.purchaseOrdersService.createPurchaseOrderReturn(user, purchaseOrderId, dto);

  }



  @Post('purchase-orders/:purchaseOrderId/cancel-remaining')

  cancelRemainingPurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

  ) {

    return this.purchaseOrdersService.cancelRemainingPurchaseOrder(user, purchaseOrderId);

  }



  @Get('purchase-orders/:purchaseOrderId')

  getPurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

  ) {

    return this.purchaseOrdersService.getPurchaseOrder(user, purchaseOrderId);

  }



  @Patch('purchase-orders/:purchaseOrderId')

  updatePurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

    @Body() dto: UpdatePurchaseOrderDto,

  ) {

    return this.purchaseOrdersService.updatePurchaseOrder(user, purchaseOrderId, dto);

  }



  @Post('purchase-orders/:purchaseOrderId/submit')

  submitPurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

  ) {

    return this.purchaseOrdersService.submitPurchaseOrder(user, purchaseOrderId);

  }



  @Post('purchase-orders/:purchaseOrderId/cancel')

  cancelPurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

  ) {

    return this.purchaseOrdersService.cancelPurchaseOrder(user, purchaseOrderId);

  }



  @Post('purchase-orders/:purchaseOrderId/receive')

  receivePurchaseOrder(

    @CurrentUser() user: AuthJwtPayload,

    @Param('purchaseOrderId') purchaseOrderId: string,

    @Body() dto: ReceivePurchaseOrderDto,

  ) {

    return this.purchaseOrdersService.receivePurchaseOrder(user, purchaseOrderId, dto);

  }



  /** Ad-hoc receive without PO — legacy shortcut */

  @Post('purchase-orders/receive')

  receivePurchase(@CurrentUser() user: AuthJwtPayload, @Body() dto: ReceivePurchaseDto) {

    return this.suppliersService.receivePurchase(user, dto);

  }

}

