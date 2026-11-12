CREATE TYPE "AttendanceSource" AS ENUM ('STAFF', 'PHONE_BIOMETRIC');

CREATE TYPE "PasskeyChallengePurpose" AS ENUM ('REGISTRATION', 'PUNCH_IN');

ALTER TABLE "Attendance"
ADD COLUMN "source" "AttendanceSource" NOT NULL DEFAULT 'STAFF';

CREATE TABLE "StudentPasskey" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "StudentPasskey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentPasskeyChallenge" (
    "studentId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "purpose" "PasskeyChallengePurpose" NOT NULL,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPasskeyChallenge_pkey" PRIMARY KEY ("studentId")
);

CREATE UNIQUE INDEX "StudentPasskey_credentialId_key" ON "StudentPasskey"("credentialId");
CREATE INDEX "StudentPasskey_studentId_createdAt_idx" ON "StudentPasskey"("studentId", "createdAt");
CREATE INDEX "StudentPasskeyChallenge_expiresAt_idx" ON "StudentPasskeyChallenge"("expiresAt");
CREATE INDEX "StudentPasskeyChallenge_sessionId_idx" ON "StudentPasskeyChallenge"("sessionId");

ALTER TABLE "StudentPasskey"
ADD CONSTRAINT "StudentPasskey_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentPasskeyChallenge"
ADD CONSTRAINT "StudentPasskeyChallenge_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentPasskeyChallenge"
ADD CONSTRAINT "StudentPasskeyChallenge_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
