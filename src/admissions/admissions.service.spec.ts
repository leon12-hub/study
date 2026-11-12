import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AdmissionDocumentStatus,
  AdmissionStatus,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdmissionsService } from './admissions.service.js';

describe('AdmissionsService', () => {
  let service: AdmissionsService;
  let moduleRef: TestingModule;
  const prisma = {
    admissionApplication: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    admissionDocument: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  const branchAdmin: AuthIdentity = {
    userId: 'admin-user',
    membershipId: 'admin-membership',
    instituteId: 'institute-id',
    branchId: 'branch-id',
    role: UserRole.BRANCH_ADMIN,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.admissionApplication.findFirst.mockResolvedValue({
      id: 'application-id',
      instituteId: 'institute-id',
      status: AdmissionStatus.SUBMITTED,
      documents: [{ status: AdmissionDocumentStatus.VERIFIED }],
    });
    prisma.admissionApplication.update.mockResolvedValue({
      id: 'application-id',
    });
    moduleRef = await Test.createTestingModule({
      providers: [
        AdmissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AdmissionsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('limits branch administrators to applications assigned to their branch', async () => {
    prisma.admissionApplication.findMany.mockResolvedValue([]);

    await service.listApplications(branchAdmin);

    expect(prisma.admissionApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instituteId: 'institute-id', branchId: 'branch-id' },
      }),
    );
  });

  it('requires all supporting documents to be verified before approval', async () => {
    prisma.admissionApplication.findFirst.mockResolvedValue({
      id: 'application-id',
      instituteId: 'institute-id',
      status: AdmissionStatus.SUBMITTED,
      documents: [{ status: AdmissionDocumentStatus.PENDING }],
    });

    await expect(
      service.reviewApplication(
        'application-id',
        { status: AdmissionStatus.APPROVED },
        branchAdmin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.admissionApplication.update).not.toHaveBeenCalled();
  });

  it('generates a student admission ID when an application is approved', async () => {
    await service.reviewApplication(
      'application-id',
      { status: AdmissionStatus.APPROVED },
      branchAdmin,
    );

    expect(prisma.admissionApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'application-id' },
        data: expect.objectContaining({
          status: AdmissionStatus.APPROVED,
          admissionNumber: expect.stringMatching(/^BL-\d{4}-[A-F0-9]{8}$/),
          reviewedByMembershipId: 'admin-membership',
        }),
      }),
    );
  });

  it('does not allow a student to review applications', async () => {
    const student: AuthIdentity = {
      ...branchAdmin,
      role: UserRole.STUDENT,
    };

    await expect(service.listApplications(student)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.admissionApplication.findMany).not.toHaveBeenCalled();
  });
});
