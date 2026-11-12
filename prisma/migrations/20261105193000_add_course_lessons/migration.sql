CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "position" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseLesson_courseId_position_key"
ON "CourseLesson"("courseId", "position");

CREATE INDEX "CourseLesson_courseId_isPublished_position_idx"
ON "CourseLesson"("courseId", "isPublished", "position");

ALTER TABLE "CourseLesson"
ADD CONSTRAINT "CourseLesson_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
