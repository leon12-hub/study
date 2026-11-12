import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialKind, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudyMaterialsService } from './study-materials.service.js';

describe('StudyMaterialsService', () => {
  let service: StudyMaterialsService;
  let prisma: {
    classSession: { findFirst: ReturnType<typeof vi.fn> };
    studyMaterial: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
  };
  let moduleRef: TestingModule;

  const admin: AuthIdentity = {
    userId: 'admin-user',
    membershipId: 'admin-membership',
    instituteId: 'institute-id',
    branchId: 'branch-id',
    role: UserRole.BRANCH_ADMIN,
  };
  const parent: AuthIdentity = {
    userId: 'parent-user',
    membershipId: 'parent-membership',
    instituteId: 'institute-id',
    branchId: null,
    role: UserRole.PARENT,
  };

  beforeEach(async () => {
    prisma = {
      classSession: {
        findFirst: vi.fn().mockResolvedValue({ id: 'session-id' }),
      },
      studyMaterial: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'material-id' }),
      },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'student-id' }),
      },
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        StudyMaterialsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(StudyMaterialsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates materials only for a class session in the branch scope', async () => {
    await service.createSessionMaterial(
      'session-id',
      {
        title: 'Cell structure notes',
        kind: MaterialKind.PDF,
        fileUrl: 'https://files.example.org/cell-structure.pdf',
      },
      admin,
    );

    expect(prisma.classSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'institute-id',
          batch: { is: { branchId: 'branch-id' } },
        }),
      }),
    );
    expect(prisma.studyMaterial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instituteId: 'institute-id',
          sessionId: 'session-id',
          createdByMembershipId: 'admin-membership',
          downloadable: true,
        }),
      }),
    );
  });

  it('does not expose another teacher’s class materials', async () => {
    prisma.classSession.findFirst.mockResolvedValue(null);
    const teacher: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    await expect(
      service.listSessionMaterials('other-session', teacher),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studyMaterial.findMany).not.toHaveBeenCalled();
  });

  it('limits parent materials to active classes of linked children', async () => {
    await service.listParentMaterials(parent);

    expect(prisma.studyMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          session: {
            is: {
              batch: {
                is: {
                  instituteId: 'institute-id',
                  isActive: true,
                  enrollments: {
                    some: {
                      status: 'ACTIVE',
                      student: {
                        is: {
                          parentLinks: {
                            some: {
                              parentMembershipId: 'parent-membership',
                              parentMembership: { instituteId: 'institute-id' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        take: 100,
      }),
    );
  });

  it('does not expose private study files for unlinked students', async () => {
    await expect(
      service.getParentMaterialFile('private-material', parent),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studyMaterial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'private-material',
          instituteId: 'institute-id',
          session: expect.any(Object),
        }),
      }),
    );
  });

  it('keeps link materials online-only', async () => {
    await service.createSessionMaterial(
      'session-id',
      {
        title: 'Reference site',
        kind: MaterialKind.LINK,
        fileUrl: 'https://example.org/reference',
        downloadable: true,
      },
      admin,
    );

    expect(prisma.studyMaterial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ downloadable: false }),
      }),
    );
  });

  it('returns only materials linked to the student’s active enrollments', async () => {
    const student: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await service.listStudentMaterials(student);

    expect(prisma.studyMaterial.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'institute-id',
          session: {
            is: {
              batch: {
                is: {
                  enrollments: {
                    some: { studentId: 'student-id', status: 'ACTIVE' },
                  },
                },
              },
            },
          },
        }),
      }),
    );
  });

  it('only returns uploaded files from a student’s active batch enrollments', async () => {
    const student: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await expect(
      service.getStudentMaterialFile('material-id', student),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.studyMaterial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'material-id',
          instituteId: 'institute-id',
          session: {
            is: {
              batch: {
                is: {
                  enrollments: {
                    some: {
                      studentId: 'student-id',
                      status: 'ACTIVE',
                    },
                  },
                },
              },
            },
          },
        }),
      }),
    );
  });
});
