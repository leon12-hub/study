import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/auth.decorators.js';
import { AppService } from './app.service.js';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHealth() {
    return this.appService.getHealth();
  }
}
