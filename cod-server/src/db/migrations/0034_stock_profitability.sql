-- Extension 3 : coûts et rentabilité. Aucune table du noyau n'est modifiée.
CREATE TABLE IF NOT EXISTS ext_sp_product_costs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  supplier TEXT,
  cost_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  compare_at_price REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_sp_product_costs_unique ON ext_sp_product_costs(product_id, COALESCE(variant_id, ''));
CREATE INDEX IF NOT EXISTS idx_ext_sp_product_costs_product ON ext_sp_product_costs(product_id, variant_id);

CREATE TABLE IF NOT EXISTS ext_sp_order_costs (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  delivery_cost REAL NOT NULL DEFAULT 0,
  return_fee REAL NOT NULL DEFAULT 0,
  confirmation_fee REAL NOT NULL DEFAULT 0,
  packaging_fee REAL NOT NULL DEFAULT 0,
  ad_cost REAL NOT NULL DEFAULT 0,
  other_fees REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ext_sp_order_line_costs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_product_id TEXT NOT NULL UNIQUE REFERENCES order_products(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_id TEXT REFERENCES product_variants(id),
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_sale REAL NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  resalable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ext_sp_order_lines_order ON ext_sp_order_line_costs(order_id);
CREATE INDEX IF NOT EXISTS idx_ext_sp_order_lines_product ON ext_sp_order_line_costs(product_id, variant_id);

CREATE TABLE IF NOT EXISTS ext_sp_expenses (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL,
  platform TEXT,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ext_sp_expenses_period ON ext_sp_expenses(store_id, expense_date);

CREATE TABLE IF NOT EXISTS ext_sp_events (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'default',
  event_name TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE(event_name, aggregate_id)
);
CREATE INDEX IF NOT EXISTS idx_ext_sp_events_status ON ext_sp_events(status, created_at);

CREATE TABLE IF NOT EXISTS ext_sp_logs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL DEFAULT 'default',
  level TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ext_sp_logs_date ON ext_sp_logs(store_id, created_at);
