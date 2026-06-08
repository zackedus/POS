import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import {
  CreatePayableDto,
  CreatePayableFromPoDto,
  ListPayablesQueryDto,
  RecordPayablePaymentDto,
} from './dto/payable.dto';
import { PayablesService } from './payables.service';

@Controller('payables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  list(@CurrentUser() user: AuthJwtPayload, @Query() query: ListPayablesQueryDto) {
    return this.payablesService.list(user, query);
  }

  @Get('overdue')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  listOverdue(@CurrentUser() user: AuthJwtPayload) {
    return this.payablesService.listOverdue(user);
  }

  @Get(':payableId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getById(@CurrentUser() user: AuthJwtPayload, @Param('payableId') payableId: string) {
    return this.payablesService.getById(user, payableId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreatePayableDto) {
    return this.payablesService.create(user, dto);
  }

  @Post('from-po/:purchaseOrderId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  createFromPo(
    @CurrentUser() user: AuthJwtPayload,
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() dto: CreatePayableFromPoDto,
  ) {
    return this.payablesService.createFromPurchaseOrder(user, purchaseOrderId, dto);
  }

  @Post(':payableId/payments')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  recordPayment(
    @CurrentUser() user: AuthJwtPayload,
    @Param('payableId') payableId: string,
    @Body() dto: RecordPayablePaymentDto,
  ) {
    return this.payablesService.recordPayment(user, payableId, dto);
  }
}
