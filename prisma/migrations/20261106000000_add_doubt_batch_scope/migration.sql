ALTER TABLE "Doubt" ADD COLUMN "batchId" TEXT;

CREATE INDEX "Doubt_batchId_idx" ON "Doubt"("batchId");

ALTER TABLE "Doubt"
ADD CONSTRAINT "Doubt_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
