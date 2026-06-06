import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import {
  CreateExpenseDto,
  ExpenseSummaryQueryDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  listExpenses(@CurrentUser() user: AuthJwtPayload, @Query() query: ListExpensesQueryDto) {
    return this.expensesService.listExpenses(user, query);
  }

  @Get('summary/today')
  getTodaySummary(@CurrentUser() user: AuthJwtPayload, @Query() query: ExpenseSummaryQueryDto) {
    return this.expensesService.getTodaySummary(user, query);
  }

  @Post()
  createExpense(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createExpense(user, dto);
  }

  @Patch(':expenseId')
  updateExpense(
    @CurrentUser() user: AuthJwtPayload,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(user, expenseId, dto);
  }
}
