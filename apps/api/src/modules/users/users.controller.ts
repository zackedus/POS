import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  listUsers(@CurrentUser() user: AuthJwtPayload) {
    return this.usersService.listUsers(user);
  }

  @Get(':userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  getUser(@CurrentUser() user: AuthJwtPayload, @Param('userId') userId: string) {
    return this.usersService.getUser(user, userId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  createUser(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(user, dto);
  }

  @Patch(':userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateUser(
    @CurrentUser() user: AuthJwtPayload,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user, userId, dto);
  }

  @Delete(':userId')
  @Roles(UserRole.OWNER)
  deactivateUser(@CurrentUser() user: AuthJwtPayload, @Param('userId') userId: string) {
    return this.usersService.deactivateUser(user, userId);
  }
}
