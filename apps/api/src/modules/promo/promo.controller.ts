import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreatePromoRuleDto, UpdatePromoRuleDto } from './dto/promo.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { PromoService } from './promo.service';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  list(@CurrentUser() user: AuthJwtPayload) {
    return this.promoService.list(user);
  }

  @Get('active')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  listActive(@CurrentUser() user: AuthJwtPayload) {
    return this.promoService.listActiveForPos(user);
  }

  @Post('validate')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  validate(@CurrentUser() user: AuthJwtPayload, @Body() dto: ValidatePromoDto) {
    return this.promoService.validateWithItems(user, dto.promoRuleId, dto.items);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreatePromoRuleDto) {
    return this.promoService.create(user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePromoRuleDto,
  ) {
    return this.promoService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  remove(@CurrentUser() user: AuthJwtPayload, @Param('id') id: string) {
    return this.promoService.remove(user, id);
  }
}
