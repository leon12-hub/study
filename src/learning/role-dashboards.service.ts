import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  EnrollmentStatus,
  ExamStatus,
  UserRole,
} from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RoleDashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdminPortalPreview(actor: AuthIdentity) {
    const instituteId = this.requirePortalAdmin(actor);
    const students = await this.prisma.studentProfile.findMany({
      where: {
        membership: {
          instituteId,
          role: UserRole.STUDENT,
          ...(actor.role === UserRole.BRANCH_ADMIN
            ? { branchId: actor.branchId }
            : {}),
        },
      },
      orderBy: { membership: { user: { fullName: 'asc' } } },
      select: {
        id: true,
        admissionNumber: true,
        membership: {
          select: {
            id: true,
            user: { select: { fullName: true } },
          },
        },
        parentLinks: {
          where: {
            parentMembership: { instituteId, role: UserRole.PARENT },
          },
          select: {
            relationship: true,
            parentMembership: {
              select: {
                id: true,
                branchId: true,
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });
    const parents = new Map<
      string,
      {
        id: string;
        branchId: string | null;
        fullName: string;
        children: { id: string; fullName: string; admissionNumber: string }[];
      }
    >();
    for (const student of students) {
      for (const link of student.parentLinks) {
        const parent = link.parentMembership;
        const entry = parents.get(parent.id) ?? {
          id: parent.id,
          branchId: parent.branchId,
          fullName: parent.user.fullName,
          children: [],
        };
        entry.children.push({
          id: student.id,
          fullName: student.membership.user.fullName,
          admissionNumber: student.admissionNumber,
        });
        parents.set(parent.id, entry);
      }
    }

    return {
      students: students.map((student) => ({
        id: student.id,
        membershipId: student.membership.id,
        fullName: student.membership.user.fullName,

        admissionNumber: student.admissionNumber,
      })),
      parents: [...parents.values()]
        .filter(
          (parent) =>
            actor.role !== UserRole.BRANCH_ADMIN ||
            parent.branchId === null ||
            parent.branchId === actor.branchId,
        )
        .map(({ branchId: _branchId, ...parent }) => parent),
    };
  }

  async getAdminStudentPreview(studentId: string, actor: AuthIdentity) {
    const instituteId = this.requirePortalAdmin(actor);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        id: studentId,
        membership: {
          instituteId,
          role: UserRole.STUDENT,
          ...(actor.role === UserRole.BRANCH_ADMIN
            ? { branchId: actor.branchId }
            : {}),
        },
      },
      select: { membershipId: true, membership: { select: { userId: true } } },
    });
    if (!student) {
      throw new NotFoundException('Student not found in your scope.');
    }
    return this.getStudentDashboard({
      ...actor,
      userId: student.membership.userId,
      membershipId: student.membershipId,
      role: UserRole.STUDENT,
    });
  }

  async getAdminParentPreview(parentMembershipId: string, actor: AuthIdentity) {
    const instituteId = this.requirePortalAdmin(actor);
    const parent = await this.prisma.membership.findFirst({
      where: {
        id: parentMembershipId,
        instituteId,
        role: UserRole.PARENT,
        ...(actor.role === UserRole.BRANCH_ADMIN
          ? {
              OR: [
                { branchId: null },
                { branchId: actor.branchId },
                {
                  parentLinks: {
                    some: {
                      student: {
                        membership: { branchId: actor.branchId },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: { id: true, userId: true, branchId: true },
    });
    if (!parent) {
      throw new NotFoundException('Parent not found in your scope.');
    }
    return this.getParentDashboard({
      ...actor,
      userId: parent.userId,
      membershipId: parent.id,
      role: UserRole.PARENT,
      branchId:
        actor.role === UserRole.BRANCH_ADMIN ? actor.branchId : parent.branchId,
    });
  }

  async getStudentDashboard(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        membershipId: actor.membershipId,
        membership: { instituteId },
      },
      select: {
        id: true,
        admissionNumber: true,
        membership: { select: { user: { select: { fullName: true } } } },
      },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }

    const now = new Date();
    const enrollmentScope = {
      studentId: student.id,
      status: EnrollmentStatus.ACTIVE,
    };
    const activeBatchScope = {
      instituteId,
      isActive: true,
    };
    const activitySince = new Date(now);
    activitySince.setFullYear(activitySince.getFullYear() - 1);
    const attendanceWhere = {
      studentId: student.id,
      classSession: { instituteId },
    };
    const [
      enrollments,
      assignments,
      exams,
      attendanceCount,
      attendanceByStatus,
      activity,
      results,
    ] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { ...enrollmentScope, batch: activeBatchScope },
        orderBy: { enrolledAt: 'desc' },
        select: {
          batch: {
            select: {
              id: true,
              name: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  subjects: { select: { id: true, name: true } },
                },
              },
              sessions: {
                where: { startsAt: { gte: now } },
                orderBy: { startsAt: 'asc' },
                take: 3,
                select: {
                  id: true,
                  title: true,
                  startsAt: true,
                  endsAt: true,
                  mode: true,
                  joinUrl: true,
                  subject: { select: { name: true } },
                  teacher: {
                    select: { user: { select: { fullName: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.assignment.findMany({
        where: {
          instituteId,
          batch: {
            is: {
              ...activeBatchScope,
              enrollments: { some: enrollmentScope },
            },
          },
        },
        orderBy: { dueAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          dueAt: true,
          batch: {
            select: { name: true, course: { select: { name: true } } },
          },
          submissions: {
            where: { studentId: student.id },
            select: { submittedAt: true, marksAwarded: true },
            take: 1,
          },
        },
      }),
      this.prisma.exam.findMany({
        where: {
          instituteId,
          status: {
            in: [
              ExamStatus.PUBLISHED,
              ExamStatus.SCHEDULED,
              ExamStatus.COMPLETED,
            ],
          },
          subject: {
            course: {
              batches: {
                some: {
                  enrollments: { some: enrollmentScope },
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          subject: { select: { name: true } },
          attempts: {
            where: { studentId: student.id },
            select: {
              status: true,
              result: { select: { score: true, percentage: true } },
            },
            take: 1,
          },
        },
      }),
      this.prisma.attendance.count({
        where: attendanceWhere,
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: attendanceWhere,
        _count: { _all: true },
      }),
      this.prisma.attendance.findMany({
        where: { ...attendanceWhere, markedAt: { gte: activitySince } },
        orderBy: { markedAt: 'desc' },
        take: 500,
        select: { markedAt: true, status: true, source: true },
      }),
      this.prisma.result.findMany({
        where: {
          attempt: {
            is: {
              studentId: student.id,
              exam: { is: { instituteId } },
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: {
          percentage: true,
          publishedAt: true,
          attempt: {
            select: {
              exam: { select: { subject: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const attendedCount = attendanceByStatus
      .filter(({ status }) => status === 'PRESENT' || status === 'LATE')
      .reduce((total, { _count }) => total + _count._all, 0);
    const scoredResults = results.map(({ percentage }) => Number(percentage));

    return {
      profile: {
        fullName: student.membership.user.fullName,
        admissionNumber: student.admissionNumber,
      },
      metrics: {
        courses: new Set(enrollments.map(({ batch }) => batch.course.id)).size,
        activeAssignments: assignments.filter(
          ({ submissions, dueAt }) => !submissions.length && dueAt >= now,
        ).length,
        assessments: exams.length,
        recordedClasses: attendanceCount,
        attendanceRate:
          attendanceCount > 0
            ? Math.round((attendedCount / attendanceCount) * 100)
            : null,
        averageTestScore:
          scoredResults.length > 0
            ? Math.round(
                scoredResults.reduce((total, score) => total + score, 0) /
                  scoredResults.length,
              )
            : null,
      },
      activity: activity.map(({ markedAt, status, source }) => ({
        markedAt,
        status,
        source,
      })),
      performance: results.map(({ percentage, publishedAt, attempt }) => ({
        percentage: Number(percentage),
        publishedAt,
        subject: attempt.exam.subject.name,
      })),
      courses: enrollments.map(({ batch }) => batch),
      assignments: assignments.map(({ submissions, ...assignment }) => ({
        ...assignment,
        submission: submissions[0] ?? null,
      })),
      exams: exams.map(({ attempts, ...exam }) => ({
        ...exam,
        attempt: attempts[0] ?? null,
      })),
    };
  }

  async getTeacherDashboard(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, UserRole.TEACHER);
    const now = new Date();
    const todayStartsAt = new Date(now);
    todayStartsAt.setHours(0, 0, 0, 0);
    const tomorrowStartsAt = new Date(todayStartsAt);
    tomorrowStartsAt.setDate(tomorrowStartsAt.getDate() + 1);
    const batchScope = {
      instituteId,
      isActive: true,
      teacherMembershipId: actor.membershipId,
    };
    const sessionScope = {
      instituteId,
      teacherMembershipId: actor.membershipId,
    };
    const assignmentScope = { instituteId, batch: { is: batchScope } };
    const examScope = {
      instituteId,
      subject: {
        course: { batches: { some: batchScope } },
      },
    };
    const [
      teacher,
      batches,
      assignedStudents,
      sessions,
      todaySessions,
      assignments,
      exams,
      upcomingClasses,
      assignmentCount,
      pendingEvaluations,
      upcomingExams,
      attendanceByStatus,
    ] = await Promise.all([
      this.prisma.membership.findUnique({
        where: { id: actor.membershipId },
        select: { user: { select: { fullName: true } } },
      }),
      this.prisma.batch.findMany({
        where: batchScope,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          course: { select: { name: true } },
          _count: {
            select: {
              enrollments: { where: { status: EnrollmentStatus.ACTIVE } },
            },
          },
        },
      }),
      this.prisma.enrollment.groupBy({
        by: ['studentId'],
        where: {
          status: EnrollmentStatus.ACTIVE,
          batch: { is: batchScope },
        },
      }),
      this.prisma.classSession.findMany({
        where: { ...sessionScope, startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          mode: true,
          joinUrl: true,
          batch: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
      this.prisma.classSession.findMany({
        where: {
          ...sessionScope,
          startsAt: { gte: todayStartsAt, lt: tomorrowStartsAt },
        },
        orderBy: { startsAt: 'asc' },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          mode: true,
          joinUrl: true,
          batch: { select: { name: true } },
          subject: { select: { name: true } },
        },
      }),
      this.prisma.assignment.findMany({
        where: assignmentScope,
        orderBy: { dueAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          dueAt: true,
          batch: { select: { name: true, course: { select: { name: true } } } },
          _count: { select: { submissions: true } },
        },
      }),
      this.prisma.exam.findMany({
        where: examScope,
        orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          subject: { select: { name: true } },
        },
      }),
      this.prisma.classSession.count({
        where: { ...sessionScope, startsAt: { gte: now } },
      }),
      this.prisma.assignment.count({ where: assignmentScope }),
      this.prisma.assignmentSubmission.count({
        where: {
          marksAwarded: null,
          assignment: { is: assignmentScope },
        },
      }),
      this.prisma.exam.count({
        where: {
          ...examScope,
          startsAt: { gte: now },
          status: { in: [ExamStatus.SCHEDULED, ExamStatus.PUBLISHED] },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { classSession: sessionScope },
        _count: { _all: true },
      }),
    ]);

    const attendanceCounts: Record<AttendanceStatus, number> = {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0,
    };
    for (const entry of attendanceByStatus) {
      attendanceCounts[entry.status] = entry._count._all;
    }
    const attended =
      attendanceCounts[AttendanceStatus.PRESENT] +
      attendanceCounts[AttendanceStatus.LATE];
    const attendanceTotal =
      attended + attendanceCounts[AttendanceStatus.ABSENT];

    return {
      profile: { fullName: teacher?.user.fullName ?? 'Teacher' },
      metrics: {
        activeBatches: batches.length,
        students: assignedStudents.length,
        upcomingClasses,
        assignments: assignmentCount,
        pendingEvaluations,
        upcomingExams,
        attendanceRate:
          attendanceTotal === 0
            ? null
            : Math.round((attended / attendanceTotal) * 100),
      },
      batches,
      sessions,
      todaySessions,
      assignments,
      exams,
    };
  }

  async getParentDashboard(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, UserRole.PARENT);
    const now = new Date();
    const attendanceSince = new Date(now);
    attendanceSince.setDate(attendanceSince.getDate() - 90);
    const activeBatchScope = { instituteId, isActive: true };
    const links = await this.prisma.parentStudent.findMany({
      where: {
        parentMembershipId: actor.membershipId,
        student: {
          membership: {
            instituteId,
            ...(actor.branchId ? { branchId: actor.branchId } : {}),
          },
        },
      },
      orderBy: { student: { membership: { user: { fullName: 'asc' } } } },
      select: {
        relationship: true,
        student: {
          select: {
            id: true,
            admissionNumber: true,
            membership: { select: { user: { select: { fullName: true } } } },
            enrollments: {
              where: {
                status: EnrollmentStatus.ACTIVE,
                batch: activeBatchScope,
              },
              select: {
                batch: {
                  select: {
                    id: true,
                    name: true,
                    branch: { select: { name: true, city: true } },
                    teacher: {
                      select: { user: { select: { fullName: true } } },
                    },
                    course: { select: { name: true } },
                    sessions: {
                      where: { startsAt: { gte: now } },
                      orderBy: { startsAt: 'asc' },
                      take: 5,
                      select: {
                        id: true,
                        title: true,
                        startsAt: true,
                        endsAt: true,
                        mode: true,
                        subject: { select: { name: true } },
                        teacher: {
                          select: { user: { select: { fullName: true } } },
                        },
                      },
                    },
                    assignments: {
                      where: {
                        instituteId,
                      },
                      orderBy: { dueAt: 'asc' },
                      take: 20,
                      select: {
                        id: true,
                        title: true,
                        dueAt: true,
                      },
                    },
                  },
                },
              },
            },
            attempts: {
              where: { result: { isNot: null } },
              orderBy: { startedAt: 'desc' },
              take: 20,
              select: {
                exam: {
                  select: {
                    id: true,
                    title: true,
                    subject: { select: { name: true } },
                  },
                },
                result: {
                  select: { score: true, percentage: true, publishedAt: true },
                },
              },
            },
            _count: { select: { attendances: true } },
          },
        },
      },
    });
    const assignmentIds = links.flatMap(({ student }) =>
      student.enrollments.flatMap(({ batch }) =>
        batch.assignments.map(({ id }) => id),
      ),
    );
    const studentIds = links.map(({ student }) => student.id);
    const submissions =
      assignmentIds.length && studentIds.length
        ? await this.prisma.assignmentSubmission.findMany({
            where: {
              assignmentId: { in: assignmentIds },
              studentId: { in: studentIds },
            },
            select: { assignmentId: true, studentId: true, submittedAt: true },
          })
        : [];
    const scheduledExams = studentIds.length
      ? await this.prisma.exam.findMany({
          where: {
            instituteId,
            status: { in: [ExamStatus.PUBLISHED, ExamStatus.SCHEDULED] },
            startsAt: { gte: now },
            subject: {
              course: {
                batches: {
                  some: {
                    instituteId,
                    isActive: true,
                    enrollments: {
                      some: {
                        studentId: { in: studentIds },
                        status: EnrollmentStatus.ACTIVE,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { startsAt: 'asc' },
          take: 50,
          select: {
            id: true,
            title: true,
            status: true,
            startsAt: true,
            subject: {
              select: {
                name: true,
                course: {
                  select: {
                    name: true,
                    batches: {
                      where: {
                        instituteId,
                        isActive: true,
                        enrollments: {
                          some: {
                            studentId: { in: studentIds },
                            status: EnrollmentStatus.ACTIVE,
                          },
                        },
                      },
                      select: {
                        enrollments: {
                          where: {
                            studentId: { in: studentIds },
                            status: EnrollmentStatus.ACTIVE,
                          },
                          select: { studentId: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : [];
    const scheduledExamsByStudent = new Map<
      string,
      {
        id: string;
        title: string;
        status: ExamStatus;
        startsAt: Date | null;
        subject: string;
        course: string;
      }[]
    >();
    for (const exam of scheduledExams) {
      for (const batch of exam.subject.course.batches) {
        for (const enrollment of batch.enrollments) {
          const exams = scheduledExamsByStudent.get(enrollment.studentId) ?? [];
          if (!exams.some(({ id }) => id === exam.id)) {
            exams.push({
              id: exam.id,
              title: exam.title,
              status: exam.status,
              startsAt: exam.startsAt,
              subject: exam.subject.name,
              course: exam.subject.course.name,
            });
            scheduledExamsByStudent.set(enrollment.studentId, exams);
          }
        }
      }
    }
    const submittedAtByPair = new Map(
      submissions.map((submission) => [
        `${submission.studentId}:${submission.assignmentId}`,
        submission.submittedAt,
      ]),
    );
    const [attendanceGroups, attendanceRecords] = studentIds.length
      ? await Promise.all([
          this.prisma.attendance.groupBy({
            by: ['studentId', 'status'],
            where: {
              studentId: { in: studentIds },
              classSession: { instituteId },
            },
            _count: { _all: true },
          }),
          this.prisma.attendance.findMany({
            where: {
              studentId: { in: studentIds },
              markedAt: { gte: attendanceSince },
              classSession: { instituteId },
            },
            orderBy: { markedAt: 'desc' },
            take: 500,
            select: {
              id: true,
              studentId: true,
              status: true,
              source: true,
              markedAt: true,
              classSession: {
                select: {
                  id: true,
                  title: true,
                  startsAt: true,
                  subject: { select: { name: true } },
                  batch: { select: { name: true } },
                },
              },
            },
          }),
        ])
      : [[], []];
    const attendanceByStudent = new Map<
      string,
      { present: number; absent: number; late: number; excused: number }
    >();
    for (const { studentId, status, _count } of attendanceGroups) {
      const counts = attendanceByStudent.get(studentId) ?? {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
      if (status === 'PRESENT') counts.present = _count._all;
      if (status === 'ABSENT') counts.absent = _count._all;
      if (status === 'LATE') counts.late = _count._all;
      if (status === 'EXCUSED') counts.excused = _count._all;
      attendanceByStudent.set(studentId, counts);
    }

    return {
      children: links.map(({ relationship, student }) => ({
        id: student.id,
        fullName: student.membership.user.fullName,
        admissionNumber: student.admissionNumber,
        relationship,
        courses: student.enrollments.map(({ batch }) => ({
          id: batch.id,
          name: batch.name,
          branch: batch.branch,
          teacher: batch.teacher?.user ?? null,
          course: batch.course,
          sessions: batch.sessions,
        })),
        assignments: student.enrollments.flatMap(({ batch }) =>
          batch.assignments.map((assignment) => ({
            ...assignment,
            batch: {
              id: batch.id,
              name: batch.name,
              course: batch.course.name,
            },
            submittedAt:
              submittedAtByPair.get(`${student.id}:${assignment.id}`) ?? null,
          })),
        ),
        recentResults: student.attempts.flatMap(({ exam, result }) =>
          result ? [{ exam, ...result }] : [],
        ),
        upcomingExams: scheduledExamsByStudent.get(student.id) ?? [],
        attendanceRecords: attendanceRecords
          .filter(({ studentId }) => studentId === student.id)
          .map(({ id, status, source, markedAt, classSession }) => ({
            id,
            status,
            source,
            markedAt,
            classSession,
          })),
        recordedClasses: student._count.attendances,
        attendance: (() => {
          const counts = attendanceByStudent.get(student.id) ?? {
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
          };
          const counted = counts.present + counts.absent + counts.late;
          return {
            ...counts,
            recorded: counted + counts.excused,
            rate:
              counted > 0
                ? Math.round(((counts.present + counts.late) / counted) * 100)
                : null,
          };
        })(),
      })),
    };
  }

  private requireInstitute(actor: AuthIdentity): string {
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }
    return actor.instituteId;
  }

  private requirePortalAdmin(actor: AuthIdentity): string {
    if (
      actor.role !== UserRole.INSTITUTE_ADMIN &&
      actor.role !== UserRole.BRANCH_ADMIN
    ) {
      throw new ForbiddenException(
        'Only institute and branch administrators can preview portals.',
      );
    }
    if (actor.role === UserRole.BRANCH_ADMIN && !actor.branchId) {
      throw new ForbiddenException(
        'Your branch administrator account has no branch assigned.',
      );
    }
    return this.requireInstitute(actor);
  }

  private requireRole(actor: AuthIdentity, role: UserRole): string {
    if (actor.role !== role) {
      throw new ForbiddenException('Your role cannot view this dashboard.');
    }
    return this.requireInstitute(actor);
  }
}
