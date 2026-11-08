import { test, expect } from "@playwright/test";

test("checkout stop-desk et compatibilité thank-you", async ({ page, request }) => {
  await page.goto("/");
  await page.locator("#selection .product-card").first().getByRole("button").click();
  await page.locator("[data-option-variants] button").first().click();
  await page.locator("[data-option-confirm]").click();
  await page.goto("/checkout");
  await expect(page.locator("#checkout-main")).toBeVisible();
  await page.locator("#f-name").fill("Client Stop Desk");
  await page.locator("#f-phone").fill("0661123456");
  await page.locator("#f-wilaya-trigger").click();
  await page.locator('[data-id="f-wilaya"] button[data-value="16"]').click();
  await page.locator("#f-commune-trigger").click();
  await page.locator('[data-id="f-commune"] button[data-value]').first().click();
  await page.locator('input[name="deliveryType"][value="stop_desk"]').check({ force: true });
  await expect(page.locator("#f-address")).toBeHidden();
  await expect(page.locator("#checkout-total")).not.toHaveText("0 DA");
  await page.locator("#submit-btn").click();
  await page.waitForURL(/\/merci\?order=/, { timeout: 60_000 });
  const confirmation = new URL(page.url());
  const legacy = await request.get(`/thank-you${confirmation.search}`);
  expect(legacy.status()).toBe(200);
  expect(await legacy.text()).toContain("fbq");
});
