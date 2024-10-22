// src/user/user.controller.ts

import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async create(@Body() body: { username: string; email: string; age?: number }) {
    return this.userService.createUser(body.username, body.email, body.age);
  }

  @Get()
  async findAll() {
    return this.userService.findAll();
  }
}
