ALTER TABLE "manuscripts" ADD COLUMN "credited_author_name" varchar(255);--> statement-breakpoint
UPDATE "manuscripts"
SET "credited_author_name" = COALESCE("users"."name", 'Auteur inconnu')
FROM "users"
WHERE "manuscripts"."author_id" = "users"."id";--> statement-breakpoint
UPDATE "manuscripts"
SET "credited_author_name" = 'Auteur inconnu'
WHERE "credited_author_name" IS NULL;--> statement-breakpoint
ALTER TABLE "manuscripts" ALTER COLUMN "credited_author_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "credited_author_name" varchar(255);--> statement-breakpoint
UPDATE "publications"
SET "credited_author_name" = COALESCE("users"."name", 'Auteur inconnu')
FROM "users"
WHERE "publications"."author_id" = "users"."id";--> statement-breakpoint
UPDATE "publications"
SET "credited_author_name" = 'Auteur inconnu'
WHERE "credited_author_name" IS NULL;--> statement-breakpoint
ALTER TABLE "publications" ALTER COLUMN "credited_author_name" SET NOT NULL;
