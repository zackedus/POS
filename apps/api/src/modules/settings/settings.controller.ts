import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
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

  @Patch('tenant')
  @Roles(UserRole.OWNER)
  updateTenantSettings(@CurrentUser() user: AuthJwtPayload, @Body() dto: UpdateTenantSettingsDto) {
    return this.settingsService.updateTenantSettings(user, dto);
  }
}
