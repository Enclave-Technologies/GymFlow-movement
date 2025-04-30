-- DROP INDEX "unique_session_order";--> statement-breakpoint
CREATE INDEX "idx_session_order" ON "Sessions" USING btree ("phase_id","order_number");