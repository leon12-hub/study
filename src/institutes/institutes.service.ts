import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { UpdateInstituteDto } from './dto/update-institute.dto.js';

const INSTITUTE_PROFILE_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  primaryColor: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InstituteSelect;

@Injectable()
export class InstitutesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const institute = await this.prisma.institute.findUnique({
      where: { id: instituteId },
      select: INSTITUTE_PROFILE_SELECT,
    });

    if (!institute) {
      throw new NotFoundException('Institute not found.');
    }

    return institute;
  }

  async updateProfile(dto: UpdateInstituteDto, actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const data: Prisma.InstituteUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;
    if (dto.primaryColor !== undefined) data.primaryColor = dto.primaryColor;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide at least one institute field to update.',
      );
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const institute = await transaction.institute.update({
          where: { id: instituteId },
          data,
          select: INSTITUTE_PROFILE_SELECT,
        });

        await transaction.auditLog.create({
          data: {
            instituteId,
            actorUserId: actor.userId,
            action: 'INSTITUTE_PROFILE_UPDATED',
            entityType: 'Institute',
            entityId: instituteId,
            metadata: { changedFields: Object.keys(data) },
          },
        });

        return institute;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Institute not found.');
      }

      throw error;
    }
  }

  async getBranches(actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const branchId = this.getBranchScope(actor);

    return this.prisma.branch.findMany({
      where: {
        instituteId,
        ...(branchId ? { id: branchId } : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        instituteId: true,
        name: true,
        city: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getStudents(actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const branchId = this.getBranchScope(actor);
    return this.prisma.studentProfile.findMany({
      where: {
        membership: {
          instituteId,
          ...(branchId ? { branchId } : {}),
        },
      },
      orderBy: { membership: { user: { fullName: 'asc' } } },
      select: {
        id: true,
        admissionNumber: true,
        membership: {
          select: { user: { select: { fullName: true, email: true } } },
        },
      },
    });
  }

  async getTeachers(actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const branchId = this.getBranchScope(actor);
    return this.prisma.membership.findMany({
      where: {
        instituteId,
        role: UserRole.TEACHER,
        ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      },
      orderBy: { user: { fullName: 'asc' } },
      select: {
        id: true,
        branchId: true,
        teacher: { select: { employeeNumber: true, designation: true } },
        user: { select: { fullName: true, email: true } },
      },
    });
  }

  async createBranch(dto: CreateBranchDto, actor: AuthIdentity) {
    const instituteId = this.requireInstituteAdmin(actor);
    const name = dto.name.trim();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const branch = await transaction.branch.create({
          data: {
            instituteId,
            name,
            city: dto.city?.trim() || null,
            phone: dto.phone?.trim() || null,
          },
        });

        await transaction.auditLog.create({
          data: {
            instituteId,
            actorUserId: actor.userId,
            action: 'BRANCH_CREATED',
            entityType: 'Branch',
            entityId: branch.id,
            metadata: { branchName: branch.name },
          },
        });

        return branch;
      });
    } catch (error) {
      this.throwForDuplicate(error, 'A branch with this name already exists.');
      throw error;
    }
  }

  async updateBranch(
    branchId: string,
    dto: UpdateBranchDto,
    actor: AuthIdentity,
  ) {
    const instituteId = this.requireInstituteAdmin(actor);
    const data: Prisma.BranchUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide at least one branch field to update.',
      );
    }

    const existingBranch = await this.prisma.branch.findFirst({
      where: { id: branchId, instituteId },
      select: { id: true },
    });

    if (!existingBranch) {
      throw new NotFoundException('Branch not found in this institute.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const branch = await transaction.branch.update({
          where: { id: branchId, instituteId },
          data,
        });

        await transaction.auditLog.create({
          data: {
            instituteId,
            actorUserId: actor.userId,
            action: 'BRANCH_UPDATED',
            entityType: 'Branch',
            entityId: branch.id,
            metadata: { changedFields: Object.keys(data) },
          },
        });

        return branch;
      });
    } catch (error) {
      this.throwForDuplicate(error, 'A branch with this name already exists.');
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Branch not found in this institute.');
      }

      throw error;
    }
  }

  async getDashboard(actor: AuthIdentity) {
    const instituteId = this.requireInstituteId(actor);
    const branchId = this.getBranchScope(actor);
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const membershipScope = {
      instituteId,
      ...(branchId ? { branchId } : {}),
    };
    const attendanceScope: Prisma.AttendanceWhereInput = {
      classSession: {
        is: {
          instituteId,
          startsAt: { gte: monthStart, lte: now },
          ...(branchId ? { batch: { is: { branchId } } } : {}),
        },
      },
    };
    const paymentScope: Prisma.PaymentWhereInput = {
      status: PaymentStatus.PAID,
      fee: {
        is: {
          instituteId,
          ...(branchId
            ? {
                student: {
                  is: {
                    membership: {
                      is: { branchId },
                    },
                  },
                },
              }
            : {}),
        },
      },
    };

    const [
      institute,
      students,
      teachers,
      courses,
      branches,
      activeBatches,
      attendanceCount,
      attendedCount,
      fees,
      exams,
      upcomingExams,
      recentActivity,
    ] = await Promise.all([
      this.prisma.institute.findUnique({
        where: { id: instituteId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          primaryColor: true,
        },
      }),
      this.prisma.membership.count({
        where: { ...membershipScope, role: UserRole.STUDENT },
      }),
      this.prisma.membership.count({
        where: { ...membershipScope, role: UserRole.TEACHER },
      }),
      this.prisma.course.count({
        where: { instituteId, isActive: true },
      }),
      this.prisma.branch.count({
        where: { instituteId, ...(branchId ? { id: branchId } : {}) },
      }),
      this.prisma.batch.count({
        where: {
          instituteId,
          isActive: true,
          ...(branchId ? { branchId } : {}),
        },
      }),
      this.prisma.attendance.count({
        where: attendanceScope,
      }),
      this.prisma.attendance.count({
        where: {
          ...attendanceScope,
          status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
        },
      }),
      this.prisma.payment.aggregate({
        where: paymentScope,
        _sum: { amount: true },
      }),
      this.prisma.exam.count({ where: { instituteId } }),
      this.prisma.exam.count({
        where: {
          instituteId,
          status: 'SCHEDULED',
          startsAt: { gte: now },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          instituteId,
          ...(actor.role === UserRole.BRANCH_ADMIN
            ? { actorUserId: actor.userId }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          actor: { select: { fullName: true } },
        },
      }),
    ]);

    if (!institute) {
      throw new NotFoundException('Institute not found.');
    }

    return {
      institute,
      metrics: {
        students,
        teachers,
        courses,
        branches,
        activeBatches,
        attendanceRate:
          attendanceCount === 0
            ? 0
            : Math.round((attendedCount / attendanceCount) * 1000) / 10,
        feesCollected: Number(fees._sum?.amount?.toString() ?? '0'),
        exams,
        upcomingExams,
      },
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        action: activity.action,
        entityType: activity.entityType,
        entityId: activity.entityId,
        actorName: activity.actor?.fullName ?? null,
        createdAt: activity.createdAt,
      })),
    };
  }

  private requireInstituteId(actor: AuthIdentity): string {
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }

    return actor.instituteId;
  }

  private requireInstituteAdmin(actor: AuthIdentity): string {
    if (actor.role !== UserRole.INSTITUTE_ADMIN) {
      throw new ForbiddenException(
        'Only institute administrators can change institute settings.',
      );
    }

    return this.requireInstituteId(actor);
  }

  private getBranchScope(actor: AuthIdentity): string | null {
    if (actor.role !== UserRole.BRANCH_ADMIN) {
      return null;
    }

    if (!actor.branchId) {
      throw new ForbiddenException(
        'Your branch administrator account has no branch assigned.',
      );
    }

    return actor.branchId;
  }

  private throwForDuplicate(error: unknown, message: string): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
