-- Sortie brute à comparer à expected-demo.json et docs/VALIDATION-LOCALE.md.
SELECT
  (SELECT COUNT(*) FROM orders WHERE id LIKE 'ext-sp-demo-order-%') AS orders,
  (SELECT COUNT(*) FROM orders WHERE id LIKE 'ext-sp-demo-order-%' AND status = 'returned') AS returned_orders,
  (SELECT COUNT(*) FROM stock_movements WHERE reference LIKE 'ext-sp-demo-order-%') AS movements;

WITH line_totals AS (
  SELECT order_id,
    SUM(unit_sale * (quantity - returned_quantity) - discount * (quantity - returned_quantity) / quantity) AS revenue,
    SUM(unit_cost * (quantity - returned_quantity)) AS cogs
  FROM ext_sp_order_line_costs
  WHERE order_id LIKE 'ext-sp-demo-order-%'
  GROUP BY order_id
), order_totals AS (
  SELECT o.id, o.status, o.delivery_fee, oc.delivery_cost, oc.return_fee,
    oc.confirmation_fee, oc.packaging_fee, oc.ad_cost, oc.other_fees,
    lt.revenue, lt.cogs
  FROM orders o
  JOIN ext_sp_order_costs oc ON oc.order_id = o.id
  JOIN line_totals lt ON lt.order_id = o.id
)
SELECT status, COUNT(*) AS orders, SUM(revenue) AS revenue, SUM(cogs) AS cogs,
  SUM(revenue - cogs) AS gross_margin, SUM(delivery_fee) AS delivery_charged,
  SUM(delivery_cost) AS delivery_cost,
  SUM(revenue - cogs + delivery_fee - delivery_cost - return_fee - confirmation_fee - packaging_fee - ad_cost - other_fees) AS net_profit
FROM order_totals
GROUP BY status
ORDER BY status;

SELECT
  SUM(CASE WHEN resalable = 1 THEN returned_quantity ELSE 0 END) AS resalable_returned_units,
  SUM(CASE WHEN resalable = 0 THEN returned_quantity ELSE 0 END) AS non_resalable_returned_units
FROM ext_sp_order_line_costs
WHERE order_id LIKE 'ext-sp-demo-order-%';

SELECT SUM(amount) AS global_expenses FROM ext_sp_expenses WHERE id LIKE 'ext-sp-demo-expense-%';
SELECT inventory AS final_inventory FROM product_variants WHERE id = 'bepro-p-01-v-1';
