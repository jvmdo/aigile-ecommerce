CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer NOT NULL,
	CONSTRAINT "products_price_cents_non_negative" CHECK ("products"."price_cents" >= 0),
	CONSTRAINT "products_stock_non_negative" CHECK ("products"."stock" >= 0)
);
