import { type Page, expect, test } from "@playwright/test";
import { insertCoupon, replaceProducts, setStock } from "../support/database.ts";

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
    {
      name: "Vaso de Barro",
      description: "Vaso artesanal, 20 cm.",
      priceCents: 5000,
      stock: 3,
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

/** Checks one Cart row: name, unit price, quantity (an editable field) and item subtotal. */
async function expectCartItem(
  page: Page,
  item: { name: string; unitPrice: string; quantity: string; lineTotal: string },
): Promise<void> {
  const row = page.locator(".cart-item").filter({ hasText: item.name });
  await expect(row.locator(".cart-item-unit-price")).toHaveText(item.unitPrice);
  await expect(row.getByLabel(`Quantidade de ${item.name}`)).toHaveValue(item.quantity);
  await expect(row.locator(".cart-item-line-total")).toHaveText(item.lineTotal);
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
  await expectCartItem(page, {
    name: "Caneca Esmaltada",
    unitPrice: "R$ 39,90",
    quantity: "2",
    lineTotal: "R$ 79,80",
  });
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 79,80");

  await page.getByRole("link", { name: "Catálogo" }).click();
  await addFromCatalog(page, "Caneca Esmaltada", "1");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toHaveText(
    "Adicionado ao carrinho.",
  );
  await openCart(page);
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expectCartItem(page, {
    name: "Caneca Esmaltada",
    unitPrice: "R$ 39,90",
    quantity: "3",
    lineTotal: "R$ 119,70",
  });
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 119,70");

  await page.reload();
  await expectCartItem(page, {
    name: "Caneca Esmaltada",
    unitPrice: "R$ 39,90",
    quantity: "3",
    lineTotal: "R$ 119,70",
  });
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

test("changing a quantity in the Cart updates the item subtotal and the Subtotal", async ({
  page,
}) => {
  await page.goto("/");
  await addFromCatalog(page, "Caneca Esmaltada", "1");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toBeVisible();
  await openCart(page);

  await page.getByLabel("Quantidade de Caneca Esmaltada").fill("4");
  await page.getByRole("button", { name: "Atualizar" }).click();

  await expectCartItem(page, {
    name: "Caneca Esmaltada",
    unitPrice: "R$ 39,90",
    quantity: "4",
    lineTotal: "R$ 159,60",
  });
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 159,60");
});

test("a quantity above the Stock is refused in the Cart with the Portuguese message", async ({
  page,
}) => {
  await page.goto("/");
  await addFromCatalog(page, "Vaso de Barro", "1");
  await expect(productCard(page, "Vaso de Barro").getByRole("status")).toBeVisible();
  await openCart(page);

  await page.getByLabel("Quantidade de Vaso de Barro").fill("4");
  await page.getByRole("button", { name: "Atualizar" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "Não há estoque suficiente para essa quantidade.",
  );
});

test("removing items keeps the others, and removing the last one shows the empty Cart", async ({
  page,
}) => {
  await page.goto("/");
  await addFromCatalog(page, "Caneca Esmaltada", "2");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toBeVisible();
  await addFromCatalog(page, "Vaso de Barro", "1");
  await expect(productCard(page, "Vaso de Barro").getByRole("status")).toBeVisible();
  await openCart(page);
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 129,80");

  await page.getByRole("button", { name: "Remover Caneca Esmaltada" }).click();

  await expect(page.locator(".cart-item")).toHaveCount(1);
  await expectCartItem(page, {
    name: "Vaso de Barro",
    unitPrice: "R$ 50,00",
    quantity: "1",
    lineTotal: "R$ 50,00",
  });
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 50,00");

  await page.getByRole("button", { name: "Remover Vaso de Barro" }).click();

  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
});

test("applying a Coupon shows the Discount and the Total, and removing it restores the Total", async ({
  page,
}) => {
  await insertCoupon({
    code: "DEZ",
    type: "percentage",
    value: 10,
    expiresAt: new Date("2099-01-01T00:00:00Z"),
  });
  await page.goto("/");
  await addFromCatalog(page, "Caneca Esmaltada", "2");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toBeVisible();
  await openCart(page);

  await page.getByLabel("Código do cupom").fill("dez");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();

  await expect(page.locator(".cart-coupon-applied")).toContainText(
    "Cupom aplicado: DEZ (10% de desconto)",
  );
  await expect(page.locator(".cart-subtotal")).toHaveText("Subtotal: R$ 79,80");
  await expect(page.locator(".cart-discount")).toHaveText("Desconto: R$ 7,98");
  await expect(page.locator(".cart-total")).toHaveText("Total: R$ 71,82");

  await page.getByRole("button", { name: "Remover cupom" }).click();

  await expect(page.locator(".cart-coupon-applied")).toHaveCount(0);
  await expect(page.locator(".cart-discount")).toHaveText("Desconto: R$ 0,00");
  await expect(page.locator(".cart-total")).toHaveText("Total: R$ 79,80");
});

test("an unknown or expired Coupon code is refused with the Portuguese message", async ({
  page,
}) => {
  await insertCoupon({
    code: "VENCIDO",
    type: "fixed",
    value: 1000,
    expiresAt: new Date("2020-01-01T00:00:00Z"),
  });
  await page.goto("/");
  await addFromCatalog(page, "Vaso de Barro", "1");
  await expect(productCard(page, "Vaso de Barro").getByRole("status")).toBeVisible();
  await openCart(page);

  await page.getByLabel("Código do cupom").fill("NAOEXISTE");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByRole("alert")).toHaveText("Cupom não encontrado.");

  await page.getByLabel("Código do cupom").fill("VENCIDO");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.getByRole("alert")).toHaveText("Este cupom expirou.");
  await expect(page.locator(".cart-total")).toHaveText("Total: R$ 50,00");
});

test("checkout locks the items but keeps the Coupon editable, and going back to editing unlocks them", async ({
  page,
}) => {
  await insertCoupon({
    code: "DEZ",
    type: "percentage",
    value: 10,
    expiresAt: new Date("2099-01-01T00:00:00Z"),
  });
  await page.goto("/");
  await addFromCatalog(page, "Caneca Esmaltada", "2");
  await expect(productCard(page, "Caneca Esmaltada").getByRole("status")).toBeVisible();
  await openCart(page);
  await expect(page.locator(".cart-status")).toHaveText("Estado: Com itens");

  await page.getByRole("button", { name: "Finalizar compra" }).click();

  await expect(page.locator(".cart-status")).toHaveText("Estado: Em checkout");
  const row = page.locator(".cart-item").filter({ hasText: "Caneca Esmaltada" });
  await expect(row.locator(".cart-item-quantity")).toHaveText("2");
  await expect(page.getByLabel("Quantidade de Caneca Esmaltada")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Atualizar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remover Caneca Esmaltada" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finalizar compra" })).toHaveCount(0);

  await page.getByLabel("Código do cupom").fill("DEZ");
  await page.getByRole("button", { name: "Aplicar cupom" }).click();
  await expect(page.locator(".cart-coupon-applied")).toContainText(
    "Cupom aplicado: DEZ (10% de desconto)",
  );
  await expect(page.locator(".cart-total")).toHaveText("Total: R$ 71,82");
  await expect(page.locator(".cart-status")).toHaveText("Estado: Em checkout");

  await page.reload();
  await expect(page.locator(".cart-status")).toHaveText("Estado: Em checkout");

  await page.getByRole("button", { name: "Voltar para editar" }).click();

  await expect(page.locator(".cart-status")).toHaveText("Estado: Com itens");
  await page.getByLabel("Quantidade de Caneca Esmaltada").fill("3");
  await page.getByRole("button", { name: "Atualizar" }).click();
  await expectCartItem(page, {
    name: "Caneca Esmaltada",
    unitPrice: "R$ 39,90",
    quantity: "3",
    lineTotal: "R$ 119,70",
  });
  await expect(page.locator(".cart-total")).toHaveText("Total: R$ 107,73");
  await expect(page.getByRole("button", { name: "Finalizar compra" })).toBeVisible();
});
