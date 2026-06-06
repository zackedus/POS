import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ActiveShiftQueryDto } from './dto/active-shift-query.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ForceCloseShiftDto } from './dto/force-close-shift.dto';
import { OpenShiftDto } from './dto/open-shift.dto';
import { ClosePreviewQueryDto } from './dto/close-preview-query.dto';
import { ShiftsService } from './shifts.service';
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  openShift(@CurrentUser() user: AuthJwtPayload, @Body() dto: OpenShiftDto) {
    return this.shiftsService.openShift(user, dto);
  }

  @Get('active')
  getActiveShift(@CurrentUser() user: AuthJwtPayload, @Query() query: ActiveShiftQueryDto) {
    return this.shiftsService.getActiveShift(user, query.outletId);
  }

  @Get(':shiftId/close-preview')
  getClosePreview(
    @CurrentUser() user: AuthJwtPayload,
    @Param('shiftId') shiftId: string,
    @Query() query: ClosePreviewQueryDto,
  ) {
    return this.shiftsService.getClosePreview(user, shiftId, query.outletId);
  }

  @Post(':shiftId/close')
  closeShift(
    @CurrentUser() user: AuthJwtPayload,
    @Param('shiftId') shiftId: string,
    @Body() dto: CloseShiftDto,
  ) {
    return this.shiftsService.closeShift(user, shiftId, dto);
  }

  @Post(':shiftId/force-close')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  forceCloseShift(
    @CurrentUser() user: AuthJwtPayload,
    @Param('shiftId') shiftId: string,
    @Body() dto: ForceCloseShiftDto,
  ) {
    return this.shiftsService.forceCloseShift(user, shiftId, dto);
  }
}
