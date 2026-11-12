import { Module } from '@nestjs/common';
import { InstitutesController } from './institutes.controller.js';
import { InstitutesService } from './institutes.service.js';

@Module({
  controllers: [InstitutesController],
  providers: [InstitutesService],
})
export class InstitutesModule {}
