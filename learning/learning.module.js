var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { InstituteLearningController, StudentLearningController, } from './learning.controller.js';
import { LearningService } from './learning.service.js';
import { ParentDashboardController, AdminPortalPreviewController, StudentDashboardController, TeacherDashboardController, } from './role-dashboards.controller.js';
import { RoleDashboardsService } from './role-dashboards.service.js';
import { InstituteClassSessionsController, StudentClassSessionsController, } from './class-sessions.controller.js';
import { ClassSessionsService } from './class-sessions.service.js';
import { InstituteStudyMaterialsController, ParentStudyMaterialsController, StudentStudyMaterialsController, } from './study-materials.controller.js';
import { StudyMaterialsService } from './study-materials.service.js';
import { InstituteAiLearningController, StudentAiLearningController, } from './ai-learning.controller.js';
import { AiLearningService } from './ai-learning.service.js';
import { GeminiAiProvider } from './gemini-ai.provider.js';
import { AI_PROVIDER } from './ai-provider.js';
import { NotificationsController, StaffDoubtsController, StudentDoubtsController, } from './doubts-notifications.controller.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';
import { InstituteBillingController, ParentBillingController, StudentBillingController, } from '../billing/billing.controller.js';
import { BillingService } from '../billing/billing.service.js';
let LearningModule = class LearningModule {
};
LearningModule = __decorate([
    Module({
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
], LearningModule);
export { LearningModule };
//# sourceMappingURL=learning.module.js.map