ALTER TABLE "Phases" DROP CONSTRAINT "uniquePlanOrder";--> statement-breakpoint
ALTER TABLE "TrainerClients" DROP CONSTRAINT "uq_trainer_client";--> statement-breakpoint
ALTER TABLE "WorkoutSessionsLog" ADD COLUMN "session_id" uuid;--> statement-breakpoint
ALTER TABLE "WorkoutSessionsLog" ADD CONSTRAINT "WorkoutSessionsLog_session_id_Sessions_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."Sessions"("session_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_session_exercise_order" ON "ExercisePlanExercises" USING btree ("session_id","exerciseOrder");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX "idx_exercise_volume" ON "ExercisePlanExercises" USING btree ("repsMax","setsMax");--> statement-breakpoint
CREATE INDEX "idx_plans_creator" ON "ExercisePlans" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_plans_assigned" ON "ExercisePlans" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "idx_plans_active" ON "ExercisePlans" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_exercises_name" ON "Exercises" USING btree ("exercise_name");--> statement-breakpoint
CREATE INDEX "idx_exercises_uploader" ON "Exercises" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_exercises_approved" ON "Exercises" USING btree ("approved_by_admin");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "unique_plan_order" ON "Phases" USING btree ("plan_id","order_number");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX "idx_phase_active" ON "Phases" USING btree ("is_active");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "unique_session_order" ON "Sessions" USING btree ("phase_id","order_number");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX "idx_session_time" ON "Sessions" USING btree ("session_time" DESC NULLS LAST);--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE UNIQUE INDEX CONCURRENTLY "uq_trainer_client" ON "TrainerClients" USING btree ("trainer_id","client_id");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX "idx_client_active" ON "TrainerClients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_users_fullname" ON "Users" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_details_logid" ON "WorkoutSessionDetails" USING btree ("workout_session_log_id");--> statement-breakpoint
CREATE INDEX "idx_details_exercisename" ON "WorkoutSessionDetails" USING btree ("exercise_name");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_user_session" ON "WorkoutSessionsLog" USING btree ("user_id","session_name");--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "idx_user_starttime" ON "WorkoutSessionsLog" USING btree ("user_id","start_time" DESC NULLS LAST) WHERE "WorkoutSessionsLog"."end_time" IS NOT NULL;--> statement-breakpoint
COMMIT;--> statement-breakpoint
CREATE INDEX "idx_workoutsessionslog_sessionid" ON "WorkoutSessionsLog" USING btree ("session_id") WHERE "WorkoutSessionsLog"."session_id" IS NOT NULL;