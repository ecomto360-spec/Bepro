-- Registre commun des extensions bepro. Les secrets éventuels sont chiffrés par les modules concernés.
CREATE TABLE IF NOT EXISTS extension_registry (
  id TEXT NOT NULL,
  store_id TEXT NOT NULL DEFAULT 'default',
  enabled INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_extension_registry_store ON extension_registry(store_id, enabled);
