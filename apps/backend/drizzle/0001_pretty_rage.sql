ALTER TABLE "plays" ADD COLUMN "formation" text DEFAULT '5-1' NOT NULL;--> statement-breakpoint
ALTER TABLE "plays" ADD COLUMN "libero" boolean DEFAULT true NOT NULL;