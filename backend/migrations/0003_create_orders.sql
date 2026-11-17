CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"insertion_order" bigint GENERATED ALWAYS AS IDENTITY (sequence name "order_items_insertion_order_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	CONSTRAINT "order_items_order_product_unique" UNIQUE("order_id","product_id"),
	CONSTRAINT "order_items_quantity_range" CHECK ("order_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "order_items_unit_price_cents_non_negative" CHECK ("order_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shopper_id" uuid NOT NULL,
	"cart_id" uuid NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"coupon_code" text,
	"coupon_type" text,
	"coupon_value" integer,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "orders_cart_id_unique" UNIQUE("cart_id"),
	CONSTRAINT "orders_status_known" CHECK ("orders"."status" IN ('created')),
	CONSTRAINT "orders_money_non_negative" CHECK ("orders"."subtotal_cents" >= 0 AND "orders"."discount_cents" >= 0 AND "orders"."total_cents" >= 0),
	CONSTRAINT "orders_coupon_all_or_nothing" CHECK (("orders"."coupon_code" IS NULL AND "orders"."coupon_type" IS NULL AND "orders"."coupon_value" IS NULL) OR ("orders"."coupon_code" IS NOT NULL AND "orders"."coupon_type" IS NOT NULL AND "orders"."coupon_value" IS NOT NULL)),
	CONSTRAINT "orders_coupon_type_known" CHECK ("orders"."coupon_type" IN ('percentage', 'fixed'))
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;