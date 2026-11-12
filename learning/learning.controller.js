var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Res, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { createPrivateUploadStorage, deleteTemporaryUpload, } from '../files/private-file-storage.js';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { CreateBatchDto, UpdateBatchDto } from './dto/create-batch.dto.js';
import { CreateClassroomDto, UpdateClassroomDto, } from './dto/create-classroom.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateExamDto, SubmitExamDto } from './dto/create-exam.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { LearningService } from './learning.service.js';
let InstituteLearningController = class InstituteLearningController {
    learningService;
    constructor(learningService) {
        this.learningService = learningService;
    }
    getCourses(actor) {
        return this.learningService.getCourses(actor);
    }
    createCourse(dto, actor) {
        return this.learningService.createCourse(dto, actor);
    }
    updateCourse(courseId, dto, actor) {
        return this.learningService.updateCourse(courseId, dto, actor);
    }
    createCourseSubject(courseId, dto, actor) {
        return this.learningService.createCourseSubject(courseId, dto, actor);
    }
    getCourseLessons(courseId, actor) {
        return this.learningService.getInstituteCourseLessons(courseId, actor);
    }
    createCourseLesson(courseId, dto, actor) {
        return this.learningService.createCourseLesson(courseId, dto, actor);
    }
    async uploadCourseLesson(courseId, dto, file, actor) {
        if (!file) {
            throw new BadRequestException('A PDF or video file is required.');
        }
        try {
            return await this.learningService.createCourseLesson(courseId, dto, actor, file);
        }
        finally {
            await deleteTemporaryUpload(file.filename);
        }
    }
    async getCourseLessonFile(courseId, lessonId, actor, response) {
        const file = await this.learningService.getCourseLessonFile(courseId, lessonId, actor);
        sendCourseLessonFile(response, file);
    }
    getAssignments(actor) {
        return this.learningService.getAssignments(actor);
    }
    getBatches(actor) {
        return this.learningService.getBatches(actor);
    }
    createBatch(dto, actor) {
        return this.learningService.createBatch(dto, actor);
    }
    updateBatch(batchId, dto, actor) {
        return this.learningService.updateBatch(batchId, dto, actor);
    }
    getClassrooms(actor) {
        return this.learningService.getClassrooms(actor);
    }
    createClassroom(dto, actor) {
        return this.learningService.createClassroom(dto, actor);
    }
    updateClassroom(classroomId, dto, actor) {
        return this.learningService.updateClassroom(classroomId, dto, actor);
    }
    createAssignment(dto, actor) {
        return this.learningService.createAssignment(dto, actor);
    }
    getAssignmentSubmissions(assignmentId, actor) {
        return this.learningService.getAssignmentSubmissions(assignmentId, actor);
    }
    gradeAssignmentSubmission(assignmentId, submissionId, dto, actor) {
        return this.learningService.gradeAssignmentSubmission(assignmentId, submissionId, dto, actor);
    }
    getExams(actor) {
        return this.learningService.getInstituteExams(actor);
    }
    getExamReport(examId, actor) {
        return this.learningService.getExamReport(examId, actor);
    }
    createExam(dto, actor) {
        return this.learningService.createExam(dto, actor);
    }
};
__decorate([
    Get('courses'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getCourses", null);
__decorate([
    Post('courses'),
    Roles(UserRole.INSTITUTE_ADMIN),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCourseDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createCourse", null);
__decorate([
    Patch('courses/:courseId'),
    Roles(UserRole.INSTITUTE_ADMIN),
    __param(0, Param('courseId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateCourseDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "updateCourse", null);
__decorate([
    Post('courses/:courseId/subjects'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __param(0, Param('courseId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateSubjectDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createCourseSubject", null);
__decorate([
    Get('courses/:courseId/lessons'),
    __param(0, Param('courseId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getCourseLessons", null);
__decorate([
    Post('courses/:courseId/lessons'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Param('courseId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateLessonDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createCourseLesson", null);
__decorate([
    Post('courses/:courseId/lessons/upload'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    UseInterceptors(FileInterceptor('file', {
        storage: createPrivateUploadStorage(),
    })),
    __param(0, Param('courseId')),
    __param(1, Body()),
    __param(2, UploadedFile()),
    __param(3, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateLessonDto, Object, Object]),
    __metadata("design:returntype", Promise)
], InstituteLearningController.prototype, "uploadCourseLesson", null);
__decorate([
    Get('courses/:courseId/lessons/:lessonId/file'),
    __param(0, Param('courseId')),
    __param(1, Param('lessonId')),
    __param(2, CurrentUser()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InstituteLearningController.prototype, "getCourseLessonFile", null);
__decorate([
    Get('assignments'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getAssignments", null);
__decorate([
    Get('batches'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getBatches", null);
__decorate([
    Post('batches'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBatchDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createBatch", null);
__decorate([
    Patch('batches/:batchId'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __param(0, Param('batchId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateBatchDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "updateBatch", null);
__decorate([
    Get('classrooms'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getClassrooms", null);
__decorate([
    Post('classrooms'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateClassroomDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createClassroom", null);
__decorate([
    Patch('classrooms/:classroomId'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __param(0, Param('classroomId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateClassroomDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "updateClassroom", null);
__decorate([
    Post('assignments'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAssignmentDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createAssignment", null);
__decorate([
    Get('assignments/:assignmentId/submissions'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Param('assignmentId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getAssignmentSubmissions", null);
__decorate([
    Patch('assignments/:assignmentId/submissions/:submissionId'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Param('assignmentId')),
    __param(1, Param('submissionId')),
    __param(2, Body()),
    __param(3, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, GradeAssignmentSubmissionDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "gradeAssignmentSubmission", null);
__decorate([
    Get('exams'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getExams", null);
__decorate([
    Get('exams/:examId/report'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Param('examId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "getExamReport", null);
__decorate([
    Post('exams'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateExamDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteLearningController.prototype, "createExam", null);
InstituteLearningController = __decorate([
    Controller('institutes/me'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __metadata("design:paramtypes", [LearningService])
], InstituteLearningController);
export { InstituteLearningController };
let StudentLearningController = class StudentLearningController {
    learningService;
    constructor(learningService) {
        this.learningService = learningService;
    }
    getStudentProfile(actor) {
        return this.learningService.getStudentProfile(actor);
    }
    getStudentCourses(actor) {
        return this.learningService.getStudentCourses(actor);
    }
    getStudentCourseLessons(courseId, actor) {
        return this.learningService.getStudentCourseLessons(courseId, actor);
    }
    async getStudentCourseLessonFile(courseId, lessonId, actor, response) {
        const file = await this.learningService.getCourseLessonFile(courseId, lessonId, actor);
        sendCourseLessonFile(response, file);
    }
    getStudentAssignments(actor) {
        return this.learningService.getStudentAssignments(actor);
    }
    submitAssignment(assignmentId, dto, actor) {
        return this.learningService.submitAssignment(assignmentId, dto.answerText, actor);
    }
    getStudentExams(actor) {
        return this.learningService.getStudentExams(actor);
    }
    startExam(examId, actor) {
        return this.learningService.startExam(examId, actor);
    }
    submitExam(examId, attemptId, dto, actor) {
        return this.learningService.submitExam(examId, attemptId, dto, actor);
    }
};
__decorate([
    Get('profile'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "getStudentProfile", null);
__decorate([
    Get('courses'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "getStudentCourses", null);
__decorate([
    Get('courses/:courseId/lessons'),
    __param(0, Param('courseId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "getStudentCourseLessons", null);
__decorate([
    Get('courses/:courseId/lessons/:lessonId/file'),
    __param(0, Param('courseId')),
    __param(1, Param('lessonId')),
    __param(2, CurrentUser()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentLearningController.prototype, "getStudentCourseLessonFile", null);
__decorate([
    Get('assignments'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "getStudentAssignments", null);
__decorate([
    Post('assignments/:assignmentId/submission'),
    __param(0, Param('assignmentId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SubmitAssignmentDto, Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "submitAssignment", null);
__decorate([
    Get('exams'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "getStudentExams", null);
__decorate([
    Post('exams/:examId/attempt'),
    __param(0, Param('examId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "startExam", null);
__decorate([
    Post('exams/:examId/attempt/:attemptId/submit'),
    __param(0, Param('examId')),
    __param(1, Param('attemptId')),
    __param(2, Body()),
    __param(3, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, SubmitExamDto, Object]),
    __metadata("design:returntype", void 0)
], StudentLearningController.prototype, "submitExam", null);
StudentLearningController = __decorate([
    Controller('students/me'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [LearningService])
], StudentLearningController);
export { StudentLearningController };
function sendCourseLessonFile(response, file) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\r\n]/g, '_')}"`);
    response.sendFile(file.path);
}
//# sourceMappingURL=learning.controller.js.map