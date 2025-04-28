-- ALTER TABLE "Users" ALTER COLUMN "appwrite_id" DROP NOT NULL;--> statement-breakpoint
-- ALTER TABLE "Users" ADD COLUMN "has_auth" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "WorkoutSessionDetails" ADD COLUMN "setOrderMarker" text;