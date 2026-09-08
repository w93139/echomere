ALTER TABLE "User" ADD COLUMN "currentPlan" TEXT NOT NULL DEFAULT 'free';

ALTER TABLE "Profile" ADD COLUMN "calendarType" TEXT NOT NULL DEFAULT 'solar';
ALTER TABLE "Profile" ADD COLUMN "isLeapMonth" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "longitude" REAL;
ALTER TABLE "Profile" ADD COLUMN "relationship" TEXT;
ALTER TABLE "Profile" ADD COLUMN "industry" TEXT;
ALTER TABLE "Profile" ADD COLUMN "job" TEXT;
ALTER TABLE "Profile" ADD COLUMN "knowledge" TEXT;
