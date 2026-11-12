import { Module } from '@nestjs/common';
import {
  InstituteAdmissionsController,
  PublicAdmissionsController,
} from './admissions.controller.js';
import { AdmissionsService } from './admissions.service.js';

@Module({
  controllers: [PublicAdmissionsController, InstituteAdmissionsController],
  providers: [AdmissionsService],
})
export class AdmissionsModule {}
