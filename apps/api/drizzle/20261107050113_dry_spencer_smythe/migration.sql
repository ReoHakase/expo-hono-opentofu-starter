CREATE TABLE "avatar" (
	"user_id" text PRIMARY KEY,
	"version" uuid NOT NULL,
	"data" bytea NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avatar" ADD CONSTRAINT "avatar_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;