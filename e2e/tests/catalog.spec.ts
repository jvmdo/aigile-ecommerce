import { expect, test } from "@playwright/test";
import { replaceProducts } from "../support/database.ts";

test.beforeAll(async () => {
  await replaceProducts([
    {
      name: "Caneca Esmaltada",
      description: "Caneca de ágata azul, 350 ml.",
      priceCents: 3990,
      stock: 12,
    },
    {
      name: "Luminária de Mesa",
      description: "Luminária articulada de metal.",
      priceCents: 125000,
      stock: 0,
    },
  ]);
});

test("the catalog shows the Products from the database with prices in reais", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator("product-card");
  await expect(cards).toHaveCount(2);

  const mug = cards.filter({ hasText: "Caneca Esmaltada" });
  await expect(mug).toContainText("Caneca de ágata azul, 350 ml.");
  await expect(mug).toContainText("R$ 39,90");
  await expect(mug).toContainText("Estoque: 12");

  const lamp = cards.filter({ hasText: "Luminária de Mesa" });
  await expect(lamp).toContainText("R$ 1.250,00");
});

test('a Product with zero Stock shows the "Esgotado" badge', async ({ page }) => {
  await page.goto("/");

  const lamp = page.locator("product-card").filter({ hasText: "Luminária de Mesa" });
  await expect(lamp).toContainText("Estoque: 0");
  await expect(lamp.getByText("Esgotado", { exact: true })).toBeVisible();

  const mug = page.locator("product-card").filter({ hasText: "Caneca Esmaltada" });
  await expect(mug).toBeVisible();
  await expect(mug.getByText("Esgotado", { exact: true })).toHaveCount(0);
});

test("the page and the API it proxies come with the security headers", async ({ request }) => {
  for (const path of ["/", "/api/products"]) {
    const response = await request.get(path);

    expect(response.ok(), path).toBe(true);
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain("default-src 'self'");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers.server, path).toBe("nginx");
  }
});
