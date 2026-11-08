export interface ProfitLine {
  unitCost: number;
  unitSale: number;
  quantity: number;
  discount?: number;
  returnedQuantity?: number;
}

export interface OrderCosts {
  deliveryCharged?: number;
  deliveryCost?: number;
  returnFee?: number;
  confirmationFee?: number;
  packagingFee?: number;
  adCost?: number;
  otherFees?: number;
}

const n = (value: number | undefined) => Number.isFinite(value) ? Number(value) : 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const keptDiscount = (line: ProfitLine) => {
  const quantity = Math.max(0, n(line.quantity));
  const kept = Math.max(0, quantity - n(line.returnedQuantity));
  return quantity > 0 ? n(line.discount) * kept / quantity : 0;
};

/** La remise est proratisée : une ligne entièrement retournée ne garde aucune remise négative. */
export function grossMargin(lines: ProfitLine[]): number {
  return round(lines.reduce((sum, line) => {
    const kept = Math.max(0, n(line.quantity) - n(line.returnedQuantity));
    return sum + (n(line.unitSale) - n(line.unitCost)) * kept - keptDiscount(line);
  }, 0));
}

export function productRevenue(lines: ProfitLine[]): number {
  return round(lines.reduce((sum, line) => {
    const kept = Math.max(0, n(line.quantity) - n(line.returnedQuantity));
    return sum + n(line.unitSale) * kept - keptDiscount(line);
  }, 0));
}

export function costOfGoods(lines: ProfitLine[]): number {
  return round(lines.reduce((sum, line) => {
    const kept = Math.max(0, n(line.quantity) - n(line.returnedQuantity));
    return sum + n(line.unitCost) * kept;
  }, 0));
}

/** Bénéfice net avant dépenses globales (salaires, loyer, campagnes mensuelles). */
export function netProfit(lines: ProfitLine[], costs: OrderCosts): number {
  return round(grossMargin(lines)
    + n(costs.deliveryCharged)
    - n(costs.deliveryCost)
    - n(costs.returnFee)
    - n(costs.confirmationFee)
    - n(costs.packagingFee)
    - n(costs.adCost)
    - n(costs.otherFees));
}

export function marginPercent(profit: number, revenue: number): number {
  return revenue <= 0 ? 0 : round((profit / revenue) * 100);
}

export function summarizeOrder(lines: ProfitLine[], costs: OrderCosts) {
  const revenue = productRevenue(lines);
  const gross = grossMargin(lines);
  const net = netProfit(lines, costs);
  return {
    revenue,
    cogs: costOfGoods(lines),
    grossMargin: gross,
    netProfit: net,
    marginPercent: marginPercent(net, revenue),
    deliveryCharged: n(costs.deliveryCharged),
    deliveryCost: n(costs.deliveryCost),
    otherCosts: round(n(costs.returnFee) + n(costs.confirmationFee) + n(costs.packagingFee) + n(costs.adCost) + n(costs.otherFees)),
  };
}
