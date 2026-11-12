import { Module } from '@nestjs/common';
import {
  InstituteLearningController,
  StudentLearningController,
} from './learning.controller.js';
import { LearningService } from './learning.service.js';
import {
  ParentDashboardController,
  AdminPortalPreviewController,
  StudentDashboardController,
  TeacherDashboardController,
} from './role-dashboards.controller.js';
import { RoleDashboardsService } from './role-dashboards.service.js';
import {
  InstituteClassSessionsController,
  StudentClassSessionsController,
} from './class-sessions.controller.js';
import { ClassSessionsService } from './class-sessions.service.js';
import {
  InstituteStudyMaterialsController,
  ParentStudyMaterialsController,
  StudentStudyMaterialsController,
} from './study-materials.controller.js';
import { StudyMaterialsService } from './study-materials.service.js';
import {
  InstituteAiLearningController,
  StudentAiLearningController,
} from './ai-learning.controller.js';
import { AiLearningService } from './ai-learning.service.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';
import { AI_PROVIDER } from './ai-provider.js';
import {
  NotificationsController,
  StaffDoubtsController,
  StudentDoubtsController,
} from './doubts-notifications.controller.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';
import {
  InstituteBillingController,
  ParentBillingController,
  StudentBillingController,
} from '../billing/billing.controller.js';
import { BillingService } from '../billing/billing.service.js';

@Module({
  controllers: [
    InstituteLearningController,
    StudentLearningController,
    StudentDashboardController,
    TeacherDashboardController,
    ParentDashboardController,
    AdminPortalPreviewController,
    InstituteClassSessionsController,
    StudentClassSessionsController,
    InstituteStudyMaterialsController,
    ParentStudyMaterialsController,
    StudentStudyMaterialsController,
    InstituteAiLearningController,
    StudentAiLearningController,
    StudentDoubtsController,
    StaffDoubtsController,
    NotificationsController,
    InstituteBillingController,
    StudentBillingController,
    ParentBillingController,
  ],
  providers: [
    LearningService,
    RoleDashboardsService,
    ClassSessionsService,
    StudyMaterialsService,
    AiLearningService,
    GeminiAiProvider,
    { provide: AI_PROVIDER, useExisting: GeminiAiProvider },
    DoubtsNotificationsService,
    BillingService,
  ],
})
export class LearningModule {}
