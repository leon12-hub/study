export declare enum LoginPortal {
    ADMIN = "ADMIN",
    TEACHER = "TEACHER",
    STUDENT = "STUDENT",
    PARENT = "PARENT"
}
export declare class LoginDto {
    email: string;
    password: string;
    portal?: LoginPortal;
}
