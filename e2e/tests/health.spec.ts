import { expect, test } from "@playwright/test";

test("/health answers 200 through nginx", async ({ request }) => {
  const response = await request.get("/health");

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
