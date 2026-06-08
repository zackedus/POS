import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ListDepositsQueryDto, RefundDepositDto, TopUpDepositDto } from './dto/deposit.dto';
import { DepositsService } from './deposits.service';

@Controller('deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  list(@CurrentUser() user: AuthJwtPayload, @Query() query: ListDepositsQueryDto) {
    return this.depositsService.list(user, query);
  }

  @Get('customers/:customerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  getByCustomer(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.depositsService.getByCustomerId(user, customerId);
  }

  @Post('top-up')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  topUp(@CurrentUser() user: AuthJwtPayload, @Body() dto: TopUpDepositDto) {
    return this.depositsService.topUp(user, dto);
  }

  @Post('customers/:customerId/refund')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  refund(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Body() dto: RefundDepositDto,
  ) {
    return this.depositsService.refund(user, customerId, dto);
  }
}
