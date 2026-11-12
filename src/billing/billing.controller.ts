import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateFeeDto } from './dto/create-fee.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';
import { BillingService } from './billing.service.js';

@Controller('institutes/me/fees')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
export class InstituteBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.billing.listInstituteFees(actor);
  }

  @Post()
  create(@Body() dto: CreateFeeDto, @CurrentUser() actor: AuthIdentity) {
    return this.billing.createFee(dto, actor);
  }

  @Post(':feeId/payments/manual')
  recordManualPayment(
    @Param('feeId') feeId: string,
    @Body() dto: RecordManualPaymentDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.billing.recordManualPayment(feeId, dto, actor);
  }
}

@Controller('students/me/fees')
@Roles(UserRole.STUDENT)
export class StudentBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.billing.listStudentFees(actor);
  }
}

@Controller('parents/me/fees')
@Roles(UserRole.PARENT)
export class ParentBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.billing.listParentFees(actor);
  }
}
