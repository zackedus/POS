import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { UserRole } from '@barokah/database';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { RolesGuard } from '../../common/guards/roles.guard';

import type { AuthJwtPayload } from '../auth/auth.types';

import { CheckoutCashDto } from './dto/checkout-cash.dto';

import { CheckoutSplitDto } from './dto/checkout-split.dto';

import { HoldTransactionDto } from './dto/hold-transaction.dto';

import { ListHeldTransactionsDto } from './dto/list-held-transactions.dto';

import { ListRecentTransactionsDto } from './dto/list-recent-transactions.dto';

import { GetReceiptQueryDto } from './dto/get-receipt-query.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';

import { ValidateCartDto } from './dto/validate-cart.dto';

import { VoidTransactionDto } from './dto/void-transaction.dto';

import { InitiateQrisDto } from './dto/initiate-qris.dto';

import { TransactionsService } from './transactions.service';

import { QrisPaymentService } from './qris-payment.service';



@Controller('transactions')

@UseGuards(JwtAuthGuard, RolesGuard)

export class TransactionsController {

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly qrisPaymentService: QrisPaymentService,
  ) {}



  @Post('validate-cart')
  validateCart(@CurrentUser() user: AuthJwtPayload, @Body() dto: ValidateCartDto) {
    return this.transactionsService.validateCart(user, dto);
  }

  @Post('checkout-cash')

  checkoutCash(@CurrentUser() user: AuthJwtPayload, @Body() dto: CheckoutCashDto) {

    return this.transactionsService.checkoutCash(user, dto);

  }



  @Post('checkout-split')

  checkoutSplit(@CurrentUser() user: AuthJwtPayload, @Body() dto: CheckoutSplitDto) {

    return this.transactionsService.checkoutSplit(user, dto);

  }

  @Post('qris/initiate')
  initiateQris(@CurrentUser() user: AuthJwtPayload, @Body() dto: InitiateQrisDto) {
    return this.qrisPaymentService.initiate(user, dto);
  }

  @Get('qris/:paymentId/status')
  getQrisStatus(@CurrentUser() user: AuthJwtPayload, @Param('paymentId') paymentId: string) {
    return this.qrisPaymentService.getStatus(user, paymentId);
  }

  @Post('qris/:paymentId/confirm-mock')
  confirmQrisMock(@CurrentUser() user: AuthJwtPayload, @Param('paymentId') paymentId: string) {
    return this.qrisPaymentService.confirmMockPayment(user, paymentId);
  }



  @Post('hold')

  holdTransaction(@CurrentUser() user: AuthJwtPayload, @Body() dto: HoldTransactionDto) {

    return this.transactionsService.holdTransaction(user, dto);

  }



  @Get('held')

  listHeldTransactions(@CurrentUser() user: AuthJwtPayload, @Query() query: ListHeldTransactionsDto) {

    return this.transactionsService.listHeldTransactions(user, query);

  }



  @Delete('held/:id')

  recallHeldTransaction(@CurrentUser() user: AuthJwtPayload, @Param('id') heldId: string, @Query() query: ListHeldTransactionsDto) {

    return this.transactionsService.recallHeldTransaction(user, heldId, query.outletId);

  }



  @Get('recent')

  listRecentTransactions(@CurrentUser() user: AuthJwtPayload, @Query() query: ListRecentTransactionsDto) {

    return this.transactionsService.listRecentTransactions(user, query);

  }



  @Post(':id/void')

  voidTransaction(

    @CurrentUser() user: AuthJwtPayload,

    @Param('id') transactionId: string,

    @Body() dto: VoidTransactionDto,

  ) {

    return this.transactionsService.voidTransaction(user, transactionId, dto);

  }



  @Post(':id/refund')

  @Roles(UserRole.OWNER, UserRole.MANAGER)

  refundTransaction(

    @CurrentUser() user: AuthJwtPayload,

    @Param('id') transactionId: string,

    @Body() dto: RefundTransactionDto,

  ) {

    return this.transactionsService.refundTransaction(user, transactionId, dto);

  }



  @Get(':id/receipt')

  getReceipt(

    @CurrentUser() user: AuthJwtPayload,

    @Param('id') transactionId: string,

    @Query() query: GetReceiptQueryDto,

  ) {

    return this.transactionsService.getReceipt(user, transactionId, query.outletId);

  }

}

