import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';
import { OutletsService } from './outlets.service';

@Controller('outlets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OutletsController {
  constructor(private readonly outletsService: OutletsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  listOutlets(
    @CurrentUser() user: AuthJwtPayload,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.outletsService.listOutlets(user, includeInactive === 'true');
  }

  @Post()
  @Roles(UserRole.OWNER)
  createOutlet(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateOutletDto) {
    return this.outletsService.createOutlet(user, dto);
  }

  @Patch(':outletId')
  @Roles(UserRole.OWNER)
  updateOutlet(
    @CurrentUser() user: AuthJwtPayload,
    @Param('outletId') outletId: string,
    @Body() dto: UpdateOutletDto,
  ) {
    return this.outletsService.updateOutlet(user, outletId, dto);
  }
}
