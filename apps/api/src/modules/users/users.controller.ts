import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserPermissionsDto,
  ResetPasswordDto,
  UpdateUserRoleDto,
} from './dto/create-user.dto';
import type { User } from '@geveze/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Patch(':id/permissions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  updatePermissions(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
  ): Promise<User> {
    return this.usersService.updatePermissions(req.user, id, dto.permissions);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'manager')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.usersService.resetPassword(id, dto.newPassword);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateRole(id, dto.role);
  }
}
