import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.INSTITUTE_ADMIN,
    UserRole.BRANCH_ADMIN,
  )
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.usersService.create(dto, actor);
  }
}
