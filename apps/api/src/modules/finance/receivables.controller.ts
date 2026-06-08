import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import {
  CreateReceivableDto,
  ListReceivablesQueryDto,
  RecordReceivablePaymentDto,
  UpdateCustomerCreditLimitDto,
  AgingReportQueryDto,
  CustomerStatementQueryDto,
} from './dto/receivable.dto';
import { ReceivablesService } from './receivables.service';

@Controller('receivables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  list(@CurrentUser() user: AuthJwtPayload, @Query() query: ListReceivablesQueryDto) {
    return this.receivablesService.list(user, query);
  }

  @Get('overdue')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  listOverdue(@CurrentUser() user: AuthJwtPayload, @Query() query: ListReceivablesQueryDto) {
    return this.receivablesService.listOverdue(user, query);
  }

  @Get('aging')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  agingReport(@CurrentUser() user: AuthJwtPayload, @Query() query: AgingReportQueryDto) {
    return this.receivablesService.getAgingReport(user, query);
  }

  @Get('customers/:customerId/statement')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  customerStatement(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Query() query: CustomerStatementQueryDto,
  ) {
    return this.receivablesService.getCustomerStatement(user, customerId, query);
  }

  @Get('customers/:customerId/summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  customerSummary(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.receivablesService.getCustomerFinanceSummary(user, customerId);
  }

  @Patch('customers/:customerId/credit-limit')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateCreditLimit(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerCreditLimitDto,
  ) {
    return this.receivablesService.updateCustomerCreditLimit(user, customerId, dto);
  }

  @Get(':receivableId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  getById(@CurrentUser() user: AuthJwtPayload, @Param('receivableId') receivableId: string) {
    return this.receivablesService.getById(user, receivableId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateReceivableDto) {
    return this.receivablesService.create(user, dto);
  }

  @Post(':receivableId/payments')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  recordPayment(
    @CurrentUser() user: AuthJwtPayload,
    @Param('receivableId') receivableId: string,
    @Body() dto: RecordReceivablePaymentDto,
  ) {
    return this.receivablesService.recordPayment(user, receivableId, dto);
  }
}
