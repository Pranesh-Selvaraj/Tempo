CREATE TYPE "public"."court_type" AS ENUM('indoor', 'beach');--> statement-breakpoint
CREATE TYPE "public"."play_category" AS ENUM('serve_receive', 'attack', 'defense', 'transition', 'block', 'serve');--> statement-breakpoint
CREATE TYPE "public"."recording_format" AS ENUM('webm', 'mp4', 'gif', 'glb');--> statement-breakpoint
CREATE TYPE "public"."recording_preset" AS ENUM('whatsapp', 'instagram', 'presentation', 'slowmo', 'gif', 'glb');--> statement-breakpoint
CREATE TYPE "public"."trajectory_type" AS ENUM('serve', 'pass', 'set', 'attack', 'block', 'dig');--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position" jsonb NOT NULL,
	"visible_from_ms" integer,
	"visible_to_ms" integer,
	"color" text DEFAULT '#ffffff' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"name" text NOT NULL,
	"keyframes" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keyframes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"timestamp_ms" integer NOT NULL,
	"player_states" jsonb NOT NULL,
	"ball_state" jsonb,
	"camera_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"coaching_note" text
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" "play_category" DEFAULT 'serve_receive' NOT NULL,
	"rotation" integer DEFAULT 1 NOT NULL,
	"court_type" "court_type" DEFAULT 'indoor' NOT NULL,
	"net_height" numeric(4, 2) DEFAULT 2.43 NOT NULL,
	"description" text,
	"coaching_notes" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"format" "recording_format" NOT NULL,
	"preset" "recording_preset" NOT NULL,
	"duration_ms" integer NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"file_url" text,
	"thumbnail_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"diagram_url" text,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trajectories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"play_id" uuid NOT NULL,
	"type" "trajectory_type" NOT NULL,
	"control_points" jsonb NOT NULL,
	"start_time_ms" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"color" text,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"team_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_paths" ADD CONSTRAINT "camera_paths_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keyframes" ADD CONSTRAINT "keyframes_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trajectories" ADD CONSTRAINT "trajectories_play_id_plays_id_fk" FOREIGN KEY ("play_id") REFERENCES "public"."plays"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "keyframes_play_time_idx" ON "keyframes" USING btree ("play_id","timestamp_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "keyframes_play_time_uq" ON "keyframes" USING btree ("play_id","timestamp_ms");--> statement-breakpoint
CREATE INDEX "phases_play_start_idx" ON "phases" USING btree ("play_id","start_ms");--> statement-breakpoint
CREATE INDEX "trajectories_play_start_idx" ON "trajectories" USING btree ("play_id","start_time_ms");