import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeeDto } from './dto/create-fee.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';

const FEE_SELECT = {
  id: true,
  title: true,
  amount: true,
  currency: true,
  dueAt: true,
  status: true,
  createdAt: true,
  student: {
    select: {
      id: true,
      admissionNumber: true,
      membership: {
        select: {
          branchId: true,
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      amount: true,
      status: true,
      providerReference: true,
      paidAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.FeeSelect;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async listInstituteFees(actor: AuthIdentity) {
    const instituteId = this.requireAdmin(actor);
    const branchId = this.getBranchScope(actor);
    return this.prisma.fee.findMany({
      where: {
        instituteId,
        ...(branchId
          ? { student: { is: { membership: { is: { branchId } } } } }
          : {}),
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      select: FEE_SELECT,
    });
  }

  async createFee(dto: CreateFeeDto, actor: AuthIdentity) {
    const instituteId = this.requireAdmin(actor);
    const branchId = this.getBranchScope(actor);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: dto.studentId,
        membership: {
          instituteId,
          ...(branchId ? { branchId } : {}),
        },
      },
      select: {
        id: true,
        membershipId: true,
        enrollments: {
          where: {
            status: EnrollmentStatus.ACTIVE,
            batch: {
              is: {
                instituteId,
                isActive: true,
                ...(branchId ? { branchId } : {}),
              },
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found in your scope.');
    }
    if (student.enrollments.length === 0) {
      throw new ConflictException(
        'Fees can only be assigned to students with an active enrollment.',
      );
    }

    const feeData = {
      instituteId,
      studentId: student.id,
      title: dto.title.trim(),
      amount: new Prisma.Decimal(dto.amount),
      currency: dto.currency?.trim().toUpperCase() || 'INR',
      dueAt: new Date(dto.dueAt),
    };
    return this.prisma.$transaction(async (transaction) => {
      const fee = await transaction.fee.create({
        data: feeData,
        select: FEE_SELECT,
      });
      await transaction.notification.create({
        data: {
          membershipId: student.membershipId,
          category: 'FEE',
          title: 'New fee due',
          body: `${fee.title} is due ${fee.dueAt.toLocaleDateString()}.`,
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          instituteId,
          actorUserId: actor.userId,
          action: 'FEE_CREATED',
          entityType: 'Fee',
          entityId: fee.id,
          metadata: {
            studentId: student.id,
            amount: feeData.amount.toString(),
            currency: feeData.currency,
          },
        },
      });
      return fee;
    });
  }

  async listStudentFees(actor: AuthIdentity) {
    const { instituteId, studentId } = await this.requireStudent(actor);
    return this.prisma.fee.findMany({
      where: { instituteId, studentId },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: FEE_SELECT,
    });
  }

  async listParentFees(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.PARENT]);
    return this.prisma.fee.findMany({
      where: {
        instituteId,
        student: {
          is: {
            parentLinks: {
              some: {
                parentMembershipId: actor.membershipId,
                parentMembership: { instituteId },
              },
            },
          },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: FEE_SELECT,
    });
  }

  async recordManualPayment(
    feeId: string,
    dto: RecordManualPaymentDto,
    actor: AuthIdentity,
  ) {
    const instituteId = this.requireAdmin(actor);
    const branchId = this.getBranchScope(actor);
    const fee = await this.prisma.fee.findFirst({
      where: {
        id: feeId,
        instituteId,
        status: PaymentStatus.PENDING,
        ...(branchId
          ? { student: { is: { membership: { is: { branchId } } } } }
          : {}),
      },
      select: {
        id: true,
        title: true,
        amount: true,
        student: {
          select: { membershipId: true },
        },
      },
    });
    if (!fee) {
      throw new NotFoundException('Pending fee not found in your scope.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.fee.updateMany({
          where: {
            id: fee.id,
            instituteId,
            status: PaymentStatus.PENDING,
            ...(branchId
              ? { student: { is: { membership: { is: { branchId } } } } }
              : {}),
          },
          data: { status: PaymentStatus.PAID },
        });
        if (claimed.count !== 1) {
          throw new ConflictException('This fee has already been reconciled.');
        }

        const payment = await transaction.payment.create({
          data: {
            feeId: fee.id,
            amount: fee.amount,
            status: PaymentStatus.PAID,
            providerReference: dto.reference?.trim() || null,
            paidAt: new Date(),
          },
          select: {
            id: true,
            feeId: true,
            amount: true,
            status: true,
            providerReference: true,
            paidAt: true,
          },
        });
        await transaction.notification.create({
          data: {
            membershipId: fee.student.membershipId,
            category: 'FEE',
            title: 'Payment recorded',
            body: `Payment for ${fee.title} has been recorded by your institute.`,
          },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            instituteId,
            actorUserId: actor.userId,
            action: 'MANUAL_PAYMENT_RECORDED',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: {
              feeId: fee.id,
              reference: dto.reference?.trim() || null,
            },
          },
        });
        return payment;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This receipt reference has already been recorded.',
        );
      }
      throw error;
    }
  }

  private async requireStudent(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        membershipId: actor.membershipId,
        membership: { instituteId },
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    return { instituteId, studentId: student.id };
  }

  private getBranchScope(actor: AuthIdentity) {
    if (actor.role !== UserRole.BRANCH_ADMIN) {
      return null;
    }
    if (!actor.branchId) {
      throw new ForbiddenException('Your account has no branch assignment.');
    }
    return actor.branchId;
  }

  private requireAdmin(actor: AuthIdentity) {
    return this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
    ]);
  }

  private requireRole(actor: AuthIdentity, roles: UserRole[]) {
    if (!roles.includes(actor.role)) {
      throw new ForbiddenException('Your role cannot access billing records.');
    }
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }
    return actor.instituteId;
  }
}
