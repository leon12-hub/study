export declare class CreateBatchDto {
    branchId: string;
    courseId: string;
    teacherMembershipId?: string;
    name: string;
    capacity?: number;
}
export declare class UpdateBatchDto {
    name?: string;
    branchId?: string;
    courseId?: string;
    teacherMembershipId?: string | null;
    capacity?: number | null;
    isActive?: boolean;
}
