import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** Fixed system roles + permission matrix (no DB table for MVP). */
  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  listRoles() {
    return this.rolesService.listRoles();
  }
}
