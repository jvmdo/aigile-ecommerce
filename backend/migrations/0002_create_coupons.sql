CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code"),
	CONSTRAINT "coupons_code_upper_case" CHECK ("coupons"."code" = upper("coupons"."code")),
	CONSTRAINT "coupons_type_known" CHECK ("coupons"."type" IN ('percentage', 'fixed')),
	CONSTRAINT "coupons_value_matches_type" CHECK (("coupons"."type" = 'percentage' AND "coupons"."value" BETWEEN 1 AND 100) OR ("coupons"."type" = 'fixed' AND "coupons"."value" > 0))
);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;