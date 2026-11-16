import { type Page, expect, test } from "@playwright/test";
import { replaceProducts, setStock } from "../support/database.ts";

// Each test gets a new browser context, so a new Shopper with no Cart.
test.beforeEach(async () => {
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

function productCard(page: Page, name: string) {
  return page.locator("product-card").filter({ hasText: name });
}

async function addFromCatalog(page: Page, name: string, quantity: string): Promise<void> {
  const card = productCard(page, name);
  await card.getByLabel("Quantidade").fill(quantity);
  await card.getByRole("button", { name: "Adicionar ao carrinho" }).click();
}

async function openCart(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Carrinho" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Carrinho" })).toBeVisible();
}

test("adding from the catalog shows the Product in the Cart, sums a repeated addition and survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  await openCart(page);
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
  await page.getByRole("link", { name: "Ver o catálogo" }).click();

  await addFromCatalog(page, "Caneca Esmaltada", "2");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toHaveText(
    "Adicionado ao carrinho.",
  );

  await openCart(page);
  const mugRow = page.locator(".cart-item").filter({ hasText: "Caneca Esmaltada" });
  await expect(mugRow.locator("td")).toHaveText(["Caneca Esmaltada", "R$ 39,90", "2", "R$ 79,80"]);
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 79,80");

  await page.getByRole("link", { name: "Catálogo" }).click();
  await addFromCatalog(page, "Caneca Esmaltada", "1");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toHaveText(
    "Adicionado ao carrinho.",
  );
  await openCart(page);
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expect(mugRow.locator("td")).toHaveText(["Caneca Esmaltada", "R$ 39,90", "3", "R$ 119,70"]);
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 119,70");

  await page.reload();
  await expect(mugRow.locator("td")).toHaveText(["Caneca Esmaltada", "R$ 39,90", "3", "R$ 119,70"]);
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 119,70");
});

test("a sold-out Product cannot be added", async ({ page }) => {
  await page.goto("/");

  const lamp = productCard(page, "Luminária de Mesa");
  await expect(lamp.getByRole("button", { name: "Adicionar ao carrinho" })).toBeDisabled();
  await expect(
    productCard(page, "Caneca Esmaltada").getByRole("button", { name: "Adicionar ao carrinho" }),
  ).toBeEnabled();
});

test("a quantity above the Stock shown is refused before anything is sent", async ({ page }) => {
  await page.goto("/");

  await addFromCatalog(page, "Caneca Esmaltada", "13");

  await expect(productCard(page, "Caneca Esmaltada").getByRole("alert")).toHaveText(
    "Só há 12 unidades em estoque.",
  );
  await openCart(page);
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
});

test("a Stock shortage the server finds is shown with its Portuguese message", async ({ page }) => {
  await page.goto("/");
  await setStock("Caneca Esmaltada", 1);

  await addFromCatalog(page, "Caneca Esmaltada", "2");

  await expect(productCard(page, "Caneca Esmaltada").getByRole("alert")).toHaveText(
    "Não há estoque suficiente para essa quantidade.",
  );
});
