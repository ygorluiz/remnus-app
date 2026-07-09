CREATE TABLE "account_deletion_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deleted_items" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"deleted_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"sentiment" text NOT NULL,
	"comment" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"created_by" text,
	"subject" text NOT NULL,
	"preheader" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"user_id" text,
	"kind" text NOT NULL,
	"subject" text,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_links" (
	"id" text PRIMARY KEY NOT NULL,
	"source_page_id" text NOT NULL,
	"target_page_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"strength" integer NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_activity" ALTER COLUMN "token_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "oauth_token_id" text;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD COLUMN "response_bytes" integer;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "platform" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_unsubscribed_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "email_suppressed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "account_deletion_tokens" ADD CONSTRAINT "account_deletion_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_feedback" ADD CONSTRAINT "demo_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_campaign_id_email_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."email_campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_deletion_tokens_user_id_idx" ON "account_deletion_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deleted_items_workspace_deleted_idx" ON "deleted_items" USING btree ("workspace_id","deleted_at");--> statement-breakpoint
CREATE INDEX "demo_feedback_created_at_idx" ON "demo_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_log_user_kind_idx" ON "email_log" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "email_log_created_at_idx" ON "email_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "email_log_campaign_id_idx" ON "email_log" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "page_links_source_idx" ON "page_links" USING btree ("source_page_id");--> statement-breakpoint
CREATE INDEX "page_links_target_idx" ON "page_links" USING btree ("target_page_id");--> statement-breakpoint
ALTER TABLE "agent_activity" ADD CONSTRAINT "agent_activity_oauth_token_id_oauth_access_tokens_id_fk" FOREIGN KEY ("oauth_token_id") REFERENCES "public"."oauth_access_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_activity" ADD CONSTRAINT "agent_activity_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_activity_owner_created_idx" ON "agent_activity" USING btree ("owner_user_id","created_at");