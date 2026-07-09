CREATE TABLE "finance_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"bank" text,
	"type" text DEFAULT 'checking' NOT NULL,
	"color" text,
	"icon" text,
	"initial_balance_cents" integer DEFAULT 0 NOT NULL,
	"current_balance_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"include_in_total" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"category_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"month" text NOT NULL,
	"alert_threshold" numeric DEFAULT '0.8' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"brand" text DEFAULT 'other' NOT NULL,
	"bank" text,
	"credit_limit_cents" integer DEFAULT 0 NOT NULL,
	"closing_day" integer,
	"due_day" integer,
	"color" text,
	"icon" text,
	"is_virtual" boolean DEFAULT false NOT NULL,
	"linked_account_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"icon" text,
	"emoji" text,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_debts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"creditor" text,
	"total_amount_cents" integer NOT NULL,
	"remaining_amount_cents" integer NOT NULL,
	"interest_rate" numeric,
	"amortization_type" text,
	"due_date" timestamp,
	"payment_schedule" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"target_amount_cents" integer NOT NULL,
	"current_amount_cents" integer DEFAULT 0 NOT NULL,
	"target_date" timestamp,
	"priority" text DEFAULT 'medium' NOT NULL,
	"category_id" text,
	"image_url" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_investment_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"investment_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" numeric NOT NULL,
	"price" numeric NOT NULL,
	"total_amount" numeric NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_investments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"brokerage" text,
	"quantity" numeric DEFAULT '0' NOT NULL,
	"average_price" numeric DEFAULT '0' NOT NULL,
	"current_price" numeric,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_recurring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"amount_cents" integer,
	"type" text,
	"frequency" text NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"next_occurrence" timestamp,
	"category_id" text,
	"account_id" text,
	"card_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"next_renewal_date" timestamp NOT NULL,
	"category_id" text,
	"account_id" text,
	"card_id" text,
	"cancel_url" text,
	"notify_before_days" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount_cents" integer NOT NULL,
	"type" text NOT NULL,
	"category_id" text,
	"account_id" text NOT NULL,
	"destination_account_id" text,
	"card_id" text,
	"transaction_date" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_rule_id" text,
	"is_installment" boolean DEFAULT false NOT NULL,
	"installment_group_id" text,
	"current_installment" integer,
	"total_installments" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"location" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_budgets" ADD CONSTRAINT "finance_budgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_cards" ADD CONSTRAINT "finance_cards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_categories" ADD CONSTRAINT "finance_categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_debts" ADD CONSTRAINT "finance_debts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_goals" ADD CONSTRAINT "finance_goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_investment_transactions" ADD CONSTRAINT "finance_investment_transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_investments" ADD CONSTRAINT "finance_investments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_recurring_rules" ADD CONSTRAINT "finance_recurring_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_subscriptions" ADD CONSTRAINT "finance_subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;