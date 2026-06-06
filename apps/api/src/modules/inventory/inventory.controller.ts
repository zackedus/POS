import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { UserRole } from '@barokah/database';

import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { Roles } from '../../common/decorators/roles.decorator';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { RolesGuard } from '../../common/guards/roles.guard';

import type { AuthJwtPayload } from '../auth/auth.types';

import { AdjustStockDto } from './dto/adjust-stock.dto';

import { InventoryQueryDto } from './dto/inventory-query.dto';

import { OpnameStockDto } from './dto/opname-stock.dto';

import { StockMovementsQueryDto } from './dto/stock-movements-query.dto';

import { TransferStockDto } from './dto/transfer-stock.dto';

import { UpdateMinStockDto } from './dto/update-min-stock.dto';

import { InventoryService } from './inventory.service';



@Controller('inventory')

@UseGuards(JwtAuthGuard, RolesGuard)

@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.INVENTORY)

export class InventoryController {

  constructor(private readonly inventoryService: InventoryService) {}



  @Get()

  listInventory(@CurrentUser() user: AuthJwtPayload, @Query() query: InventoryQueryDto) {

    return this.inventoryService.listInventory(user, query);

  }



  @Get('movements')

  listMovements(@CurrentUser() user: AuthJwtPayload, @Query() query: StockMovementsQueryDto) {

    return this.inventoryService.listMovements(user, query);

  }



  @Post('adjust')

  @Roles(UserRole.OWNER, UserRole.MANAGER)

  adjustStock(@CurrentUser() user: AuthJwtPayload, @Body() dto: AdjustStockDto) {

    return this.inventoryService.adjustStock(user, dto);

  }



  @Post('transfer')

  @Roles(UserRole.OWNER, UserRole.MANAGER)

  transferStock(@CurrentUser() user: AuthJwtPayload, @Body() dto: TransferStockDto) {

    return this.inventoryService.transferStock(user, dto);

  }



  @Post('opname')

  @Roles(UserRole.OWNER, UserRole.MANAGER)

  opnameStock(@CurrentUser() user: AuthJwtPayload, @Body() dto: OpnameStockDto) {

    return this.inventoryService.opnameStock(user, dto);

  }



  @Patch(':inventoryItemId/min-stock')

  @Roles(UserRole.OWNER, UserRole.MANAGER)

  updateMinStock(

    @CurrentUser() user: AuthJwtPayload,

    @Param('inventoryItemId') inventoryItemId: string,

    @Body() dto: UpdateMinStockDto,

  ) {

    return this.inventoryService.updateMinStock(user, inventoryItemId, dto);

  }

}


