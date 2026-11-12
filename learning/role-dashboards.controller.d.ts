import type { AuthIdentity } from '../auth/auth.types.js';
import { RoleDashboardsService } from './role-dashboards.service.js';
export declare class StudentDashboardController {
    private readonly dashboards;
    constructor(dashboards: RoleDashboardsService);
    getDashboard(actor: AuthIdentity): Promise<{
        profile: {
            fullName: string;
            admissionNumber: string;
        };
        metrics: {
            courses: number;
            activeAssignments: number;
            assessments: number;
            recordedClasses: number;
            attendanceRate: number | null;
            averageTestScore: number | null;
        };
        activity: {
            markedAt: Date;
            status: import("@prisma/client").$Enums.AttendanceStatus;
            source: import("@prisma/client").$Enums.AttendanceSource;
        }[];
        performance: {
            percentage: number;
            publishedAt: Date;
            subject: string;
        }[];
        courses: {
            course: {
                id: string;
                name: string;
                subjects: {
                    id: string;
                    name: string;
                }[];
            };
            id: string;
            name: string;
            sessions: {
                subject: {
                    name: string;
                } | null;
                id: string;
                teacher: {
                    user: {
                        fullName: string;
                    };
                };
                title: string;
                mode: import("@prisma/client").$Enums.ClassMode;
                startsAt: Date;
                endsAt: Date;
                joinUrl: string | null;
            }[];
        }[];
        assignments: {
            submission: {
                marksAwarded: import("@prisma/client/runtime/library").Decimal | null;
                submittedAt: Date;
            };
            batch: {
                course: {
                    name: string;
                };
                name: string;
            };
            id: string;
            title: string;
            dueAt: Date;
        }[];
        exams: {
            attempt: {
                result: {
                    score: import("@prisma/client/runtime/library").Decimal;
                    percentage: import("@prisma/client/runtime/library").Decimal;
                } | null;
                status: import("@prisma/client").$Enums.AttemptStatus;
            };
            subject: {
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date | null;
            status: import("@prisma/client").$Enums.ExamStatus;
        }[];
    }>;
}
export declare class TeacherDashboardController {
    private readonly dashboards;
    constructor(dashboards: RoleDashboardsService);
    getDashboard(actor: AuthIdentity): Promise<{
        profile: {
            fullName: string;
        };
        metrics: {
            activeBatches: number;
            students: number;
            upcomingClasses: number;
            assignments: number;
            pendingEvaluations: number;
            upcomingExams: number;
            attendanceRate: number | null;
        };
        batches: {
            course: {
                name: string;
            };
            id: string;
            name: string;
            _count: {
                enrollments: number;
            };
        }[];
        sessions: {
            subject: {
                name: string;
            } | null;
            batch: {
                name: string;
            };
            id: string;
            title: string;
            mode: import("@prisma/client").$Enums.ClassMode;
            startsAt: Date;
            endsAt: Date;
            joinUrl: string | null;
        }[];
        todaySessions: {
            subject: {
                name: string;
            } | null;
            batch: {
                name: string;
            };
            id: string;
            title: string;
            mode: import("@prisma/client").$Enums.ClassMode;
            startsAt: Date;
            endsAt: Date;
            joinUrl: string | null;
        }[];
        assignments: {
            batch: {
                course: {
                    name: string;
                };
                name: string;
            };
            id: string;
            _count: {
                submissions: number;
            };
            title: string;
            dueAt: Date;
        }[];
        exams: {
            subject: {
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date | null;
            status: import("@prisma/client").$Enums.ExamStatus;
        }[];
    }>;
}
export declare class ParentDashboardController {
    private readonly dashboards;
    constructor(dashboards: RoleDashboardsService);
    getDashboard(actor: AuthIdentity): Promise<{
        children: {
            id: string;
            fullName: string;
            admissionNumber: string;
            relationship: string | null;
            courses: {
                id: string;
                name: string;
                branch: {
                    name: string;
                    city: string | null;
                };
                teacher: {
                    fullName: string;
                } | null;
                course: {
                    name: string;
                };
                sessions: {
                    subject: {
                        name: string;
                    } | null;
                    id: string;
                    teacher: {
                        user: {
                            fullName: string;
                        };
                    };
                    title: string;
                    mode: import("@prisma/client").$Enums.ClassMode;
                    startsAt: Date;
                    endsAt: Date;
                }[];
            }[];
            assignments: {
                batch: {
                    id: string;
                    name: string;
                    course: string;
                };
                submittedAt: Date | null;
                id: string;
                title: string;
                dueAt: Date;
            }[];
            recentResults: {
                score: import("@prisma/client/runtime/library").Decimal;
                percentage: import("@prisma/client/runtime/library").Decimal;
                publishedAt: Date;
                exam: {
                    subject: {
                        name: string;
                    };
                    id: string;
                    title: string;
                };
            }[];
            upcomingExams: {
                id: string;
                title: string;
                status: import("@prisma/client").ExamStatus;
                startsAt: Date | null;
                subject: string;
                course: string;
            }[];
            attendanceRecords: {
                id: string;
                status: import("@prisma/client").$Enums.AttendanceStatus;
                source: import("@prisma/client").$Enums.AttendanceSource;
                markedAt: Date;
                classSession: {
                    subject: {
                        name: string;
                    } | null;
                    batch: {
                        name: string;
                    };
                    id: string;
                    title: string;
                    startsAt: Date;
                };
            }[];
            recordedClasses: number;
            attendance: {
                recorded: number;
                rate: number | null;
                present: number;
                absent: number;
                late: number;
                excused: number;
            };
        }[];
    }>;
}
export declare class AdminPortalPreviewController {
    private readonly dashboards;
    constructor(dashboards: RoleDashboardsService);
    list(actor: AuthIdentity): Promise<{
        students: {
            id: string;
            membershipId: string;
            fullName: string;
            admissionNumber: string;
        }[];
        parents: {
            id: string;
            fullName: string;
            children: {
                id: string;
                fullName: string;
                admissionNumber: string;
            }[];
        }[];
    }>;
    student(studentId: string, actor: AuthIdentity): Promise<{
        profile: {
            fullName: string;
            admissionNumber: string;
        };
        metrics: {
            courses: number;
            activeAssignments: number;
            assessments: number;
            recordedClasses: number;
            attendanceRate: number | null;
            averageTestScore: number | null;
        };
        activity: {
            markedAt: Date;
            status: import("@prisma/client").$Enums.AttendanceStatus;
            source: import("@prisma/client").$Enums.AttendanceSource;
        }[];
        performance: {
            percentage: number;
            publishedAt: Date;
            subject: string;
        }[];
        courses: {
            course: {
                id: string;
                name: string;
                subjects: {
                    id: string;
                    name: string;
                }[];
            };
            id: string;
            name: string;
            sessions: {
                subject: {
                    name: string;
                } | null;
                id: string;
                teacher: {
                    user: {
                        fullName: string;
                    };
                };
                title: string;
                mode: import("@prisma/client").$Enums.ClassMode;
                startsAt: Date;
                endsAt: Date;
                joinUrl: string | null;
            }[];
        }[];
        assignments: {
            submission: {
                marksAwarded: import("@prisma/client/runtime/library").Decimal | null;
                submittedAt: Date;
            };
            batch: {
                course: {
                    name: string;
                };
                name: string;
            };
            id: string;
            title: string;
            dueAt: Date;
        }[];
        exams: {
            attempt: {
                result: {
                    score: import("@prisma/client/runtime/library").Decimal;
                    percentage: import("@prisma/client/runtime/library").Decimal;
                } | null;
                status: import("@prisma/client").$Enums.AttemptStatus;
            };
            subject: {
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date | null;
            status: import("@prisma/client").$Enums.ExamStatus;
        }[];
    }>;
    parent(membershipId: string, actor: AuthIdentity): Promise<{
        children: {
            id: string;
            fullName: string;
            admissionNumber: string;
            relationship: string | null;
            courses: {
                id: string;
                name: string;
                branch: {
                    name: string;
                    city: string | null;
                };
                teacher: {
                    fullName: string;
                } | null;
                course: {
                    name: string;
                };
                sessions: {
                    subject: {
                        name: string;
                    } | null;
                    id: string;
                    teacher: {
                        user: {
                            fullName: string;
                        };
                    };
                    title: string;
                    mode: import("@prisma/client").$Enums.ClassMode;
                    startsAt: Date;
                    endsAt: Date;
                }[];
            }[];
            assignments: {
                batch: {
                    id: string;
                    name: string;
                    course: string;
                };
                submittedAt: Date | null;
                id: string;
                title: string;
                dueAt: Date;
            }[];
            recentResults: {
                score: import("@prisma/client/runtime/library").Decimal;
                percentage: import("@prisma/client/runtime/library").Decimal;
                publishedAt: Date;
                exam: {
                    subject: {
                        name: string;
                    };
                    id: string;
                    title: string;
                };
            }[];
            upcomingExams: {
                id: string;
                title: string;
                status: import("@prisma/client").ExamStatus;
                startsAt: Date | null;
                subject: string;
                course: string;
            }[];
            attendanceRecords: {
                id: string;
                status: import("@prisma/client").$Enums.AttendanceStatus;
                source: import("@prisma/client").$Enums.AttendanceSource;
                markedAt: Date;
                classSession: {
                    subject: {
                        name: string;
                    } | null;
                    batch: {
                        name: string;
                    };
                    id: string;
                    title: string;
                    startsAt: Date;
                };
            }[];
            recordedClasses: number;
            attendance: {
                recorded: number;
                rate: number | null;
                present: number;
                absent: number;
                late: number;
                excused: number;
            };
        }[];
    }>;
}
