import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { UpdateInstituteDto } from './dto/update-institute.dto.js';
export declare class InstitutesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProfile(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logoUrl: string | null;
        primaryColor: string;
        slug: string;
    }>;
    updateProfile(dto: UpdateInstituteDto, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logoUrl: string | null;
        primaryColor: string;
        slug: string;
    }>;
    getBranches(actor: AuthIdentity): Promise<{
        instituteId: string;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        city: string | null;
    }[]>;
    getStudents(actor: AuthIdentity): Promise<{
        membership: {
            user: {
                email: string;
                fullName: string;
            };
        };
        id: string;
        admissionNumber: string;
    }[]>;
    getTeachers(actor: AuthIdentity): Promise<{
        user: {
            email: string;
            fullName: string;
        };
        branchId: string | null;
        id: string;
        teacher: {
            employeeNumber: string | null;
            designation: string | null;
        } | null;
    }[]>;
    createBranch(dto: CreateBranchDto, actor: AuthIdentity): Promise<{
        instituteId: string;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        city: string | null;
    }>;
    updateBranch(branchId: string, dto: UpdateBranchDto, actor: AuthIdentity): Promise<{
        instituteId: string;
        id: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        city: string | null;
    }>;
    getDashboard(actor: AuthIdentity): Promise<{
        institute: {
            id: string;
            name: string;
            logoUrl: string | null;
            primaryColor: string;
            slug: string;
        };
        metrics: {
            students: number;
            teachers: number;
            courses: number;
            branches: number;
            activeBatches: number;
            attendanceRate: number;
            feesCollected: number;
            exams: number;
            upcomingExams: number;
        };
        recentActivity: {
            id: string;
            action: string;
            entityType: string;
            entityId: string | null;
            actorName: string | null;
            createdAt: Date;
        }[];
    }>;
    private requireInstituteId;
    private requireInstituteAdmin;
    private getBranchScope;
    private throwForDuplicate;
}
