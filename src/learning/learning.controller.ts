import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  createPrivateUploadStorage,
  deleteTemporaryUpload,
} from '../files/private-file-storage.js';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { CreateBatchDto, UpdateBatchDto } from './dto/create-batch.dto.js';
import {
  CreateClassroomDto,
  UpdateClassroomDto,
} from './dto/create-classroom.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateExamDto, SubmitExamDto } from './dto/create-exam.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { LearningService } from './learning.service.js';

@Controller('institutes/me')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
export class InstituteLearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('courses')
  getCourses(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getCourses(actor);
  }

  @Post('courses')
  @Roles(UserRole.INSTITUTE_ADMIN)
  createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.createCourse(dto, actor);
  }

  @Patch('courses/:courseId')
  @Roles(UserRole.INSTITUTE_ADMIN)
  updateCourse(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.updateCourse(courseId, dto, actor);
  }

  @Post('courses/:courseId/subjects')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
  createCourseSubject(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSubjectDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.createCourseSubject(courseId, dto, actor);
  }

  @Get('courses/:courseId/lessons')
  getCourseLessons(
    @Param('courseId') courseId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.getInstituteCourseLessons(courseId, actor);
  }

  @Post('courses/:courseId/lessons')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  createCourseLesson(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.createCourseLesson(courseId, dto, actor);
  }

  @Post('courses/:courseId/lessons/upload')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createPrivateUploadStorage(),
    }),
  )
  async uploadCourseLesson(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @UploadedFile()
    file:
      | {
          path: string;
          filename: string;
          originalname: string;
          mimetype: string;
          size: number;
        }
      | undefined,
    @CurrentUser() actor: AuthIdentity,
  ) {
    if (!file) {
      throw new BadRequestException('A PDF or video file is required.');
    }
    try {
      return await this.learningService.createCourseLesson(
        courseId,
        dto,
        actor,
        file,
      );
    } finally {
      await deleteTemporaryUpload(file.filename);
    }
  }

  @Get('courses/:courseId/lessons/:lessonId/file')
  async getCourseLessonFile(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const file = await this.learningService.getCourseLessonFile(
      courseId,
      lessonId,
      actor,
    );
    sendCourseLessonFile(response, file);
  }

  @Get('assignments')
  getAssignments(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getAssignments(actor);
  }

  @Get('batches')
  getBatches(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getBatches(actor);
  }

  @Post('batches')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
  createBatch(@Body() dto: CreateBatchDto, @CurrentUser() actor: AuthIdentity) {
    return this.learningService.createBatch(dto, actor);
  }

  @Patch('batches/:batchId')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
  updateBatch(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.updateBatch(batchId, dto, actor);
  }

  @Get('classrooms')
  getClassrooms(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getClassrooms(actor);
  }

  @Post('classrooms')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
  createClassroom(
    @Body() dto: CreateClassroomDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.createClassroom(dto, actor);
  }

  @Patch('classrooms/:classroomId')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
  updateClassroom(
    @Param('classroomId') classroomId: string,
    @Body() dto: UpdateClassroomDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.updateClassroom(classroomId, dto, actor);
  }

  @Post('assignments')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  createAssignment(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.createAssignment(dto, actor);
  }

  @Get('assignments/:assignmentId/submissions')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  getAssignmentSubmissions(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.getAssignmentSubmissions(assignmentId, actor);
  }

  @Patch('assignments/:assignmentId/submissions/:submissionId')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  gradeAssignmentSubmission(
    @Param('assignmentId') assignmentId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeAssignmentSubmissionDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.gradeAssignmentSubmission(
      assignmentId,
      submissionId,
      dto,
      actor,
    );
  }

  @Get('exams')
  getExams(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getInstituteExams(actor);
  }

  @Get('exams/:examId/report')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  getExamReport(
    @Param('examId') examId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.getExamReport(examId, actor);
  }

  @Post('exams')
  @Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
  createExam(@Body() dto: CreateExamDto, @CurrentUser() actor: AuthIdentity) {
    return this.learningService.createExam(dto, actor);
  }
}

@Controller('students/me')
@Roles(UserRole.STUDENT)
export class StudentLearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('profile')
  getStudentProfile(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getStudentProfile(actor);
  }

  @Get('courses')
  getStudentCourses(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getStudentCourses(actor);
  }

  @Get('courses/:courseId/lessons')
  getStudentCourseLessons(
    @Param('courseId') courseId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.getStudentCourseLessons(courseId, actor);
  }

  @Get('courses/:courseId/lessons/:lessonId/file')
  async getStudentCourseLessonFile(
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const file = await this.learningService.getCourseLessonFile(
      courseId,
      lessonId,
      actor,
    );
    sendCourseLessonFile(response, file);
  }

  @Get('assignments')
  getStudentAssignments(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getStudentAssignments(actor);
  }

  @Post('assignments/:assignmentId/submission')
  submitAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.submitAssignment(
      assignmentId,
      dto.answerText,
      actor,
    );
  }

  @Get('exams')
  getStudentExams(@CurrentUser() actor: AuthIdentity) {
    return this.learningService.getStudentExams(actor);
  }

  @Post('exams/:examId/attempt')
  startExam(
    @Param('examId') examId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.startExam(examId, actor);
  }

  @Post('exams/:examId/attempt/:attemptId/submit')
  submitExam(
    @Param('examId') examId: string,
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitExamDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.learningService.submitExam(examId, attemptId, dto, actor);
  }
}

function sendCourseLessonFile(
  response: Response,
  file: { path: string; mimeType: string; originalName: string },
) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader(
    'Content-Disposition',
    `inline; filename="${file.originalName.replace(/["\r\n]/g, '_')}"`,
  );
  response.sendFile(file.path);
}
