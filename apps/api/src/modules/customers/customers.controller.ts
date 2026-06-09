import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateCustomerAddressDto, UpdateCustomerAddressDto } from './dto/customer-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { LoyaltyLedgerQueryDto } from './dto/loyalty-ledger-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PatchCustomerCreditLimitDto } from './dto/patch-credit-limit.dto';
import { CreditAuditLogQueryDto } from './dto/credit-audit-log-query.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  list(@CurrentUser() user: AuthJwtPayload, @Query() query: ListCustomersQueryDto) {
    return this.customersService.list(user, query);
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

  @Get('lookup/by-code')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  lookupByCode(@CurrentUser() user: AuthJwtPayload, @Query('code') code?: string) {
    if (!code?.trim()) {
      return { customer: null };
    }
    return this.customersService
      .lookupByMemberCode(user.tenantId, code.trim())
      .then((customer) => ({ customer }));
  }

  @Get('lookup-by-code/:memberCode')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  lookupByCodePath(@CurrentUser() user: AuthJwtPayload, @Param('memberCode') memberCode: string) {
    return this.customersService
      .lookupByMemberCode(user.tenantId, memberCode)
      .then((customer) => ({ customer }));
  }

  @Get(':customerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  getById(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.customersService.getById(user, customerId);
  }

  @Patch(':customerId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user, customerId, dto);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user, dto);
  }

  @Patch(':customerId/credit-limit')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  patchCreditLimit(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Body() dto: PatchCustomerCreditLimitDto,
  ) {
    return this.customersService.patchCreditLimit(user, customerId, dto);
  }

  @Get(':customerId/credit-audit-log')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  creditAuditLog(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Query() query: CreditAuditLogQueryDto,
  ) {
    return this.customersService.getCreditAuditLog(
      user,
      customerId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }

  @Get(':customerId/addresses')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  listAddresses(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.customersService.listAddresses(user, customerId);
  }

  @Post(':customerId/addresses')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createAddress(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customersService.createAddress(user, customerId, dto);
  }

  @Patch(':customerId/addresses/:addressId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateAddress(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customersService.updateAddress(user, customerId, addressId, dto);
  }

  @Delete(':customerId/addresses/:addressId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  deleteAddress(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.deleteAddress(user, customerId, addressId);
  }

  @Get(':customerId/loyalty-ledger')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  loyaltyLedger(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
    @Query() query: LoyaltyLedgerQueryDto,
  ) {
    return this.customersService.getLoyaltyLedger(user, customerId, query);
  }

  @Get(':customerId/finance-summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  financeSummary(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.customersService.getFinanceSummary(user, customerId);
  }

  @Get(':customerId/member-card')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  memberCard(@CurrentUser() user: AuthJwtPayload, @Param('customerId') customerId: string) {
    return this.customersService.getMemberCard(user, customerId);
  }

  @Post(':customerId/member-card/regenerate-code')
  @Roles(UserRole.OWNER)
  regenerateMemberCode(
    @CurrentUser() user: AuthJwtPayload,
    @Param('customerId') customerId: string,
  ) {
    return this.customersService.regenerateMemberCode(user, customerId);
  }
}
