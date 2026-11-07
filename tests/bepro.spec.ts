import { test, expect } from "@playwright/test";

const screenshots = "docs/bepro-reports/captures/final";

test("accueil FR, variantes, panier, checkout COD, confirmation et suivi", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Bougez/ })).toBeVisible();
  await expect(page.locator("#selection .product-card")).toHaveCount(6);
  await expect(page.locator("#promotions .product-card")).toHaveCount(8);
  await page.screenshot({ path: `${screenshots}/home-desktop.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.locator("#selection .product-card").first().getByRole("button").click();
  await expect(page.locator("[data-option-modal]")).toBeVisible();
  await page.locator("[data-option-variants] button").nth(2).click();
  await page.locator("[data-option-confirm]").click();
  await expect(page.locator("[data-bepro-toast]")).toBeVisible();
  await expect(page.locator("[data-cart-count]").first()).toHaveText("1");

  await page.goto("/cart");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await page.screenshot({ path: `${screenshots}/cart-desktop.png`, fullPage: true });
  await page.getByRole("link", { name: /Passer la commande/ }).click();
  await expect(page.locator("#checkout-main")).toBeVisible();
  await page.locator("#f-name").fill("Client Test bepro");
  await page.locator("#f-phone").fill("0550123456");
  await page.locator("#f-wilaya-trigger").click();
  await page.locator('[data-id="f-wilaya"] button[data-value="16"]').click();
  await expect(page.locator("#f-wilaya")).toHaveValue("16");
  await page.locator("#f-commune-trigger").click();
  await page.locator('[data-id="f-commune"] button[data-value]').first().click();
  await page.locator("#f-address").fill("12 rue du Sport, Alger");
  await page.screenshot({ path: `${screenshots}/checkout-desktop.png`, fullPage: true });
  await page.locator("#submit-btn").click();
  await page.waitForURL(/\/merci\?order=/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Merci pour votre commande/ })).toBeVisible();
  const orderNumber = (await page.locator(".order-number-box strong").textContent())!.trim();
  expect(orderNumber).toMatch(/^ORD-/);
  await page.screenshot({ path: `${screenshots}/confirmation-desktop.png`, fullPage: true });

  await page.goto(`/track-order?order=${orderNumber}`);
  await page.locator("#track-phone").fill("0550123456");
  await page.getByRole("button", { name: "Rechercher ma commande" }).click();
  await expect(page.locator(".tracking-status")).toHaveText("Commande reçue");
  await expect(page.locator("[data-track-result]")).toContainText("Chaussures de running Performance");
  await page.screenshot({ path: `${screenshots}/tracking-desktop.png`, fullPage: true });
  expect(errors).toEqual([]);
});

test("mobile 390 px, arabe RTL et catalogue", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: `${screenshots}/home-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
  await page.goto("/?lang=ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: /تحرّك/ })).toBeVisible();
  await page.screenshot({ path: `${screenshots}/home-mobile-ar.png`, fullPage: true });
  await page.goto("/products?lang=ar");
  await expect(page.locator(".product-card")).toHaveCount(8);
  await expect(page.locator(".pagination")).toBeVisible();
  await page.screenshot({ path: `${screenshots}/products-mobile-ar.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
