import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FinanceSummaryQueryDto } from './dto/finance.dto';
import { FinanceSummaryService } from './finance-summary.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeSummaryService: FinanceSummaryService) {}

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getSummary(@CurrentUser() user: AuthJwtPayload, @Query() query: FinanceSummaryQueryDto) {
    return this.financeSummaryService.getSummary(user, query);
  }

  @Post('overdue-reminders')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  sendOverdueReminders(
    @CurrentUser() user: AuthJwtPayload,
    @Body() body: { outletId?: string },
  ) {
    return this.financeSummaryService.sendOverdueReminderStub(user, body.outletId);
  }
}
