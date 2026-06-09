import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('tenant')
  getTenantSettings(@CurrentUser() user: AuthJwtPayload) {
    return this.settingsService.getTenantSettings(user);
  }

  @Get('tenant/profile')
  getTenantProfile(@CurrentUser() user: AuthJwtPayload) {
    return this.settingsService.getTenantProfile(user);
  }

  @Patch('tenant/profile')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateTenantProfile(@CurrentUser() user: AuthJwtPayload, @Body() dto: UpdateTenantProfileDto) {
    return this.settingsService.updateTenantProfile(user, dto);
  }

  @Patch('tenant')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateTenantSettings(@CurrentUser() user: AuthJwtPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.settingsService.updateTenantSettings(user, dto);
  }

  @Get('tenant/storefront')
  getStorefrontSettings(@CurrentUser() user: AuthJwtPayload) {
    return this.settingsService.getStorefrontSettings(user);
  }

  @Patch('tenant/storefront')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateStorefrontSettings(
    @CurrentUser() user: AuthJwtPayload,
    @Body() dto: UpdateStorefrontSettingsDto,
  ) {
    return this.settingsService.updateStorefrontSettings(user, dto);
  }

  @Post('tenant/midtrans/test')
  @Roles(UserRole.OWNER)
  testMidtransConnection(@CurrentUser() user: AuthJwtPayload) {
    return this.settingsService.testMidtransConnection(user);
  }

  @Get('tenant/midtrans/webhook-health')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  getMidtransWebhookHealth() {
    return this.settingsService.getMidtransWebhookHealth();
  }
}
