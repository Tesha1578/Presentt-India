-- SalesOS schema for Supabase (PostgreSQL)
-- Paste into Supabase Dashboard → SQL Editor → Run.

CREATE TYPE "public"."customer_category" AS ENUM('small', 'medium', 'large');

CREATE TYPE "public"."health_grade" AS ENUM('excellent', 'good', 'average', 'poor');

CREATE TYPE "public"."invoice_status" AS ENUM('paid', 'partial', 'overdue', 'pending');

CREATE TYPE "public"."lead_activity_kind" AS ENUM('call', 'email', 'visit', 'note', 'stage-change');

CREATE TYPE "public"."lead_stage" AS ENUM('new_lead', 'enquiry_visit', 'quotation_negotiation', 'order_confirmed');

CREATE TYPE "public"."lead_status" AS ENUM('active', 'invalid_customer');

CREATE TYPE "public"."notification_type" AS ENUM('customer-inactive', 'visit-overdue', 'sales-drop', 'quotation-pending', 'lead-converted', 'payment-received', 'discount-decline', 'query-reminder', 'ai-insight');

CREATE TYPE "public"."payment_mode" AS ENUM('upi', 'neft', 'rtgs', 'cheque', 'cash', 'card');

CREATE TYPE "public"."payment_status" AS ENUM('completed', 'pending', 'failed');

CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high');

CREATE TYPE "public"."query_category" AS ENUM('quality', 'delivery', 'price', 'communication', 'others');

CREATE TYPE "public"."query_status" AS ENUM('open', 'in_progress', 'resolved');

CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'negotiation', 'accepted', 'rejected');

CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'sales_manager', 'sales_executive', 'accounts', 'user');

CREATE TYPE "public"."sales_trend" AS ENUM('increasing', 'decreasing', 'stable');

CREATE TABLE "customers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"gstin" varchar(15) NOT NULL,
	"companyAddress" varchar(512) NOT NULL,
	"region" varchar(64),
	"city" varchar(128),
	"category" "customer_category" DEFAULT 'small',
	"ownerId" bigint,
	"healthScore" integer DEFAULT 50 NOT NULL,
	"healthGrade" "health_grade" DEFAULT 'average',
	"salesTrend" "sales_trend" DEFAULT 'stable',
	"lastVisitAt" timestamp,
	"lastPurchaseAt" timestamp,
	"isDiscounted" boolean DEFAULT false NOT NULL,
	"aiSummary" text,
	"syncedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" varchar(64) NOT NULL,
	"number" varchar(64) NOT NULL,
	"date" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"dueDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" bigint NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"activity" "lead_activity_kind" NOT NULL,
	"remarks" text,
	"updatedById" bigint NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" varchar(255),
	"contactPerson" varchar(255),
	"designation" varchar(255),
	"phone" varchar(64),
	"email" varchar(320),
	"companyAddress" text,
	"googleMapsUrl" text,
	"lat" double precision,
	"lng" double precision,
	"stage" "lead_stage" DEFAULT 'new_lead',
	"status" "lead_status" DEFAULT 'active',
	"priority" "priority" DEFAULT 'medium',
	"source" varchar(128),
	"region" varchar(64),
	"city" varchar(128),
	"ownerId" bigint,
	"lastActivityAt" timestamp,
	"lastActivitySummary" varchar(512),
	"lastUpdatedById" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" bigint,
	"customerId" varchar(64),
	"date" timestamp NOT NULL,
	"attendees" jsonb NOT NULL,
	"rawNotes" text,
	"voiceNoteUrl" text,
	"aiSummary" text,
	"decisions" jsonb,
	"actionItems" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" bigint NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"entityRef" varchar(255),
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" varchar(64) NOT NULL,
	"invoiceId" bigint,
	"date" timestamp NOT NULL,
	"amount" integer NOT NULL,
	"mode" "payment_mode" DEFAULT 'neft',
	"status" "payment_status" DEFAULT 'completed' NOT NULL,
	"delayDays" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" varchar(64) NOT NULL,
	"category" "query_category" NOT NULL,
	"description" text NOT NULL,
	"dateRaised" timestamp DEFAULT now() NOT NULL,
	"raisedById" bigint NOT NULL,
	"status" "query_status" DEFAULT 'open' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"assignedToId" bigint,
	"dueDate" timestamp,
	"aiSuggestedSolution" text,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "query_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"queryId" bigint NOT NULL,
	"authorId" bigint NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" bigint NOT NULL,
	"number" varchar(64) NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"total" integer NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"validUntil" timestamp,
	"createdById" bigint,
	"aiGenerated" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "threshold_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"discountDeclinePct" integer DEFAULT 15 NOT NULL,
	"discountWindowMonths" integer DEFAULT 3 NOT NULL,
	"visitReminderDays" integer DEFAULT 45 NOT NULL,
	"noSalesAlertDays" integer DEFAULT 30 NOT NULL,
	"classificationSmallMax" integer DEFAULT 200000 NOT NULL,
	"classificationMediumMax" integer DEFAULT 1000000 NOT NULL,
	"significantChangePct" integer DEFAULT 20 NOT NULL,
	"updatedById" bigint,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"unionId" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(320),
	"avatar" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"region" varchar(64),
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignInAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_unionId_unique" UNIQUE("unionId")
);

CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" varchar(64) NOT NULL,
	"date" timestamp NOT NULL,
	"salesRepId" bigint NOT NULL,
	"remarks" text,
	"photos" jsonb,
	"voiceNotes" jsonb,
	"outcome" varchar(255),
	"nextVisitAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "customers" ADD CONSTRAINT "customers_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_updatedById_users_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "leads" ADD CONSTRAINT "leads_lastUpdatedById_users_id_fk" FOREIGN KEY ("lastUpdatedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "queries" ADD CONSTRAINT "queries_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "queries" ADD CONSTRAINT "queries_raisedById_users_id_fk" FOREIGN KEY ("raisedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "queries" ADD CONSTRAINT "queries_assignedToId_users_id_fk" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "query_comments" ADD CONSTRAINT "query_comments_queryId_queries_id_fk" FOREIGN KEY ("queryId") REFERENCES "public"."queries"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "query_comments" ADD CONSTRAINT "query_comments_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "quotations" ADD CONSTRAINT "quotations_createdById_users_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "threshold_config" ADD CONSTRAINT "threshold_config_updatedById_users_id_fk" FOREIGN KEY ("updatedById") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "visits" ADD CONSTRAINT "visits_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "visits" ADD CONSTRAINT "visits_salesRepId_users_id_fk" FOREIGN KEY ("salesRepId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE UNIQUE INDEX "customers_gstin_address_key" ON "customers" USING btree ("gstin","companyAddress");

CREATE INDEX "customers_region_idx" ON "customers" USING btree ("region");

CREATE INDEX "customers_category_idx" ON "customers" USING btree ("category");

CREATE INDEX "invoices_customer_idx" ON "invoices" USING btree ("customerId");

CREATE INDEX "invoices_number_idx" ON "invoices" USING btree ("number");

CREATE INDEX "invoices_date_idx" ON "invoices" USING btree ("date");

CREATE INDEX "lead_activities_lead_idx" ON "lead_activities" USING btree ("leadId");

CREATE INDEX "leads_owner_idx" ON "leads" USING btree ("ownerId");

CREATE INDEX "leads_stage_idx" ON "leads" USING btree ("stage");

CREATE INDEX "leads_region_idx" ON "leads" USING btree ("region");

CREATE INDEX "meetings_lead_idx" ON "meetings" USING btree ("leadId");

CREATE INDEX "meetings_customer_idx" ON "meetings" USING btree ("customerId");

CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("userId");

CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("read");

CREATE INDEX "payments_customer_idx" ON "payments" USING btree ("customerId");

CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("invoiceId");

CREATE INDEX "queries_customer_idx" ON "queries" USING btree ("customerId");

CREATE INDEX "queries_status_idx" ON "queries" USING btree ("status");

CREATE INDEX "query_comments_query_idx" ON "query_comments" USING btree ("queryId");

CREATE INDEX "quotations_lead_idx" ON "quotations" USING btree ("leadId");

CREATE INDEX "visits_customer_idx" ON "visits" USING btree ("customerId");

CREATE INDEX "visits_rep_idx" ON "visits" USING btree ("salesRepId");

CREATE INDEX "visits_date_idx" ON "visits" USING btree ("date");
