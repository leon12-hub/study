var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { CreateFeeDto } from './dto/create-fee.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';
import { BillingService } from './billing.service.js';
let InstituteBillingController = class InstituteBillingController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    list(actor) {
        return this.billing.listInstituteFees(actor);
    }
    create(dto, actor) {
        return this.billing.createFee(dto, actor);
    }
    recordManualPayment(feeId, dto, actor) {
        return this.billing.recordManualPayment(feeId, dto, actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteBillingController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateFeeDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteBillingController.prototype, "create", null);
__decorate([
    Post(':feeId/payments/manual'),
    __param(0, Param('feeId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RecordManualPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteBillingController.prototype, "recordManualPayment", null);
InstituteBillingController = __decorate([
    Controller('institutes/me/fees'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __metadata("design:paramtypes", [BillingService])
], InstituteBillingController);
export { InstituteBillingController };
let StudentBillingController = class StudentBillingController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    list(actor) {
        return this.billing.listStudentFees(actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentBillingController.prototype, "list", null);
StudentBillingController = __decorate([
    Controller('students/me/fees'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [BillingService])
], StudentBillingController);
export { StudentBillingController };
let ParentBillingController = class ParentBillingController {
    billing;
    constructor(billing) {
        this.billing = billing;
    }
    list(actor) {
        return this.billing.listParentFees(actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ParentBillingController.prototype, "list", null);
ParentBillingController = __decorate([
    Controller('parents/me/fees'),
    Roles(UserRole.PARENT),
    __metadata("design:paramtypes", [BillingService])
], ParentBillingController);
export { ParentBillingController };
//# sourceMappingURL=billing.controller.js.map