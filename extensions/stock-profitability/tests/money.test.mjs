import test from "node:test";
import assert from "node:assert/strict";
import { productRevenue, costOfGoods, grossMargin, netProfit, marginPercent, summarizeOrder } from "../server/money.ts";

const costs = { deliveryCharged: 400, deliveryCost: 250, confirmationFee: 20, packagingFee: 30, adCost: 100, returnFee: 0, otherFees: 0 };

test("revenu, COGS et marge brute d'une ligne conservée", () => {
  const lines = [{ unitSale: 2000, unitCost: 1000, quantity: 2, discount: 100 }];
  assert.equal(productRevenue(lines), 3900);
  assert.equal(costOfGoods(lines), 2000);
  assert.equal(grossMargin(lines), 1900);
});

test("retour partiel : remise et coût sont proratisés", () => {
  const lines = [{ unitSale: 2000, unitCost: 1000, quantity: 4, returnedQuantity: 1, discount: 100 }];
  assert.equal(productRevenue(lines), 5925);
  assert.equal(costOfGoods(lines), 3000);
  assert.equal(grossMargin(lines), 2925);
});

test("retour complet : aucune remise négative et COGS nul", () => {
  const lines = [{ unitSale: 2000, unitCost: 1000, quantity: 2, returnedQuantity: 2, discount: 100 }];
  assert.equal(productRevenue(lines), 0);
  assert.equal(costOfGoods(lines), 0);
  assert.equal(grossMargin(lines), 0);
});

test("bénéfice net ajoute la livraison facturée et retranche tous les coûts", () => {
  const lines = [{ unitSale: 2000, unitCost: 1000, quantity: 2, discount: 100 }];
  assert.equal(netProfit(lines, costs), 1900);
});

test("frais de retour uniquement sur commande retournée", () => {
  const lines = [{ unitSale: 2000, unitCost: 1000, quantity: 2, returnedQuantity: 2, discount: 100 }];
  assert.equal(netProfit(lines, { ...costs, returnFee: 300 }), -300);
});

test("taux de marge : arrondi et revenu non positif", () => {
  assert.equal(marginPercent(49650, 100550), 49.38);
  assert.equal(marginPercent(-900, 0), 0);
});

test("résumé complet d'une commande livrée", () => {
  assert.deepEqual(summarizeOrder([{ unitSale: 2000, unitCost: 1000, quantity: 2, discount: 100 }], costs), {
    revenue: 3900, cogs: 2000, grossMargin: 1900, netProfit: 1900,
    marginPercent: 48.72, deliveryCharged: 400, deliveryCost: 250, otherCosts: 150,
  });
});

test("quantités invalides ne produisent pas de marge négative de stock", () => {
  const lines = [{ unitSale: 100, unitCost: 40, quantity: 1, returnedQuantity: 5 }];
  assert.equal(productRevenue(lines), 0);
  assert.equal(costOfGoods(lines), 0);
});
