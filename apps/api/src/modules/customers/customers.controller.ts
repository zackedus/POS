import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  list(@CurrentUser() user: AuthJwtPayload, @Query('search') search?: string) {
    return this.customersService.list(user, search);
  }

  @Get('lookup')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  lookup(@CurrentUser() user: AuthJwtPayload, @Query('phone') phone?: string) {
    if (!phone?.trim()) {
      return { customer: null };
    }
    return this.customersService
      .lookupByPhone(user.tenantId, phone.trim())
      .then((customer) => ({ customer }));
  }

  @Get(':customerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  getById(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.customersService.getById(user, customerId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user, dto);
  }
}
