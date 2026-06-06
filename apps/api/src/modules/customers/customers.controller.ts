import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthJwtPayload } from '../auth/auth.types';
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
}
