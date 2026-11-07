import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import { getCloudEnv } from "./cloud-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const remote = process.argv.includes("--remote");
const { dbName } = getCloudEnv();
const devVarsPath = path.resolve(root, "../cod-astro/theme01/.dev.vars");
let rawKey = process.env.STORE_API_KEY;
if (!rawKey) {
  try {
    rawKey = readFileSync(devVarsPath, "utf8").match(/^STORE_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {}
}
rawKey ??= "codflow-dev-store-key";
const keyHash = createHash("sha256").update(rawKey).digest("hex");
const ts = new Date().toISOString();
const storeId = "store-local-dev";

const categories = [
  { id: "bepro-cat-shoes", name: "Chaussures de sport", slug: "chaussures-de-sport", position: 1 },
  { id: "bepro-cat-clothes", name: "Vêtements de sport", slug: "vetements-de-sport", position: 2 },
  { id: "bepro-cat-bags", name: "Sacs de sport", slug: "sacs-de-sport", position: 3 },
  { id: "bepro-cat-training", name: "Équipements d'entraînement", slug: "equipements-entrainement", position: 4 },
  { id: "bepro-cat-accessories", name: "Accessoires", slug: "accessoires", position: 5 },
];

const sizeOptions = {
  shoes: JSON.stringify([{ name: "Taille", values: [40, 41, 42, 43, 44].map((value) => ({ value: String(value) })) }]),
  clothes: JSON.stringify([{ name: "Taille", values: ["S", "M", "L", "XL"].map((value) => ({ value })) }]),
};

const products = [
  ["bepro-p-01", "Chaussures de running Performance", "performance-running", 16500, 19000, "bepro-cat-shoes", "shoes", 1],
  ["bepro-p-02", "Chaussures d'entraînement Energy", "training-energy", 18000, 22000, "bepro-cat-shoes", "shoes", 1],
  ["bepro-p-03", "Chaussures de football Terrain", "football-terrain", 14000, 17000, "bepro-cat-shoes", "shoes", 0],
  ["bepro-p-04", "T-shirt sport respirant", "tshirt-respirant", 3500, 4800, "bepro-cat-clothes", "clothes", 1],
  ["bepro-p-05", "Short de sport Movement", "short-movement", 4200, 5500, "bepro-cat-clothes", "clothes", 0],
  ["bepro-p-06", "Pantalon de jogging Essential", "jogging-essential", 5500, 7000, "bepro-cat-clothes", "clothes", 0],
  ["bepro-p-07", "Sac à dos Active", "sac-a-dos-active", 6500, 8000, "bepro-cat-bags", null, 1],
  ["bepro-p-08", "Sac de sport Duffle", "sac-sport-duffle", 5800, 7500, "bepro-cat-bags", null, 0],
  ["bepro-p-09", "Set d'haltères 20 kg", "set-halteres-20kg", 8500, 10000, "bepro-cat-training", null, 1],
  ["bepro-p-10", "Corde à sauter rapide", "corde-a-sauter", 1800, 2500, "bepro-cat-training", null, 0],
  ["bepro-p-11", "Montre connectée de sport", "montre-connectee-sport", 9500, 13000, "bepro-cat-accessories", null, 1],
  ["bepro-p-12", "Casquette sport respirante", "casquette-sport", 2800, 3500, "bepro-cat-accessories", null, 0],
].map(([id, name, handle, price, compareAtPrice, categoryId, variantType, storeFeatured]) => ({
  id, name, handle, price, compareAtPrice, categoryId, variantType, storeFeatured,
  description: `${name} pour la pratique quotidienne du sport. Produit sélectionné par bepro, avec paiement à la livraison partout en Algérie.`,
  image: `/demo/products/${handle}.webp`,
}));

const variants = products.flatMap((product) => {
  const values = product.variantType === "shoes" ? [40, 41, 42, 43, 44].map(String)
    : product.variantType === "clothes" ? ["S", "M", "L", "XL"] : [];
  return values.map((value, index) => ({
    id: `${product.id}-v-${index + 1}`,
    productId: product.id,
    variations: JSON.stringify({ Taille: value }),
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    sku: `${product.handle}-${value.toLowerCase()}`,
    inventory: 50,
    isDefault: index === 1 ? 1 : 0,
    position: index,
  }));
});

const statements = [];
const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
statements.push("DELETE FROM product_images");
statements.push("DELETE FROM product_variants");
statements.push("DELETE FROM products");
statements.push("DELETE FROM product_categories");
statements.push("DELETE FROM shipping_rule_communes");
statements.push("DELETE FROM shipping_rules");
statements.push("DELETE FROM shipping_profiles");
statements.push(`INSERT OR REPLACE INTO stores (id, name, domain, theme_id, primary_color, accent_color, bg_color, font_family, lang, currency, currency_symbol, announcement_bar, reviews_enabled, cart_enabled, status, created_at, updated_at) VALUES (${q(storeId)}, 'bepro', NULL, 'theme01', '#075bbf', '#ea580c', '#ffffff', 'Inter, Cairo, sans-serif', 'fr', 'DZD', 'DA', 'LIVRAISON 58 WILAYAS • PROMO !! • PAIEMENT À LA LIVRAISON', 1, 1, 'active', ${q(ts)}, ${q(ts)})`);
statements.push(`INSERT OR REPLACE INTO store_api_keys (id, store_id, key_hash, name, created_at) VALUES ('key-local-dev', ${q(storeId)}, ${q(keyHash)}, 'default', ${q(ts)})`);

for (const c of categories) {
  statements.push(`INSERT INTO product_categories (id, name, slug, description, parent_id, image_url, position, created_at, updated_at) VALUES (${q(c.id)}, ${q(c.name)}, ${q(c.slug)}, NULL, NULL, NULL, ${c.position}, ${q(ts)}, ${q(ts)})`);
}
for (const p of products) {
  statements.push(`INSERT INTO products (id, name, description, handle, currency, price, compare_at_price, cost_price, has_variants, variant_options, sku, inventory, track_inventory, category_id, tags, visibility, status, show_in_store, store_featured, deleted_at, created_at, updated_at) VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.description)}, ${q(p.handle)}, 'DZD', ${p.price}, ${p.compareAtPrice}, NULL, ${p.variantType ? 1 : 0}, ${p.variantType ? q(sizeOptions[p.variantType]) : "NULL"}, ${q(p.handle)}, 100, 0, ${q(p.categoryId)}, '["sport","bepro"]', 1, 'ACTIVE', 1, ${p.storeFeatured}, NULL, ${q(ts)}, ${q(ts)})`);
  statements.push(`INSERT INTO product_images (id, product_id, src, alt_text, position, created_at, updated_at) VALUES (${q(`${p.id}-image`)}, ${q(p.id)}, ${q(p.image)}, ${q(p.name)}, 0, ${q(ts)}, ${q(ts)})`);
}
for (const v of variants) {
  statements.push(`INSERT INTO product_variants (id, product_id, variations, currency, price, compare_at_price, sku, inventory, is_default, active, position, image_id, created_at, updated_at) VALUES (${q(v.id)}, ${q(v.productId)}, ${q(v.variations)}, 'DZD', ${v.price}, ${v.compareAtPrice}, ${q(v.sku)}, ${v.inventory}, ${v.isDefault}, 1, ${v.position}, NULL, ${q(ts)}, ${q(ts)})`);
}
statements.push(`INSERT INTO shipping_profiles (id, name, is_default, notes, created_at, updated_at) VALUES ('bepro-shipping-default', 'Livraison bepro 58 wilayas', 1, 'Tarifs de démonstration modifiables depuis le dashboard', ${q(ts)}, ${q(ts)})`);
for (let wilaya = 1; wilaya <= 58; wilaya++) {
  const home = [9, 16].includes(wilaya) ? 400 : wilaya <= 32 ? 600 : 700;
  const desk = [9, 16].includes(wilaya) ? 250 : wilaya <= 32 ? 400 : 500;
  statements.push(`INSERT INTO shipping_rules (id, profile_id, wilaya_id, home_price, stop_desk_price, home_enabled, stop_desk_enabled, created_at) VALUES (${q(`bepro-shipping-${wilaya}`)}, 'bepro-shipping-default', ${wilaya}, ${home}, ${desk}, 1, 1, ${q(ts)})`);
}

const sqlPath = path.join(root, ".seed-bepro.tmp.sql");
writeFileSync(sqlPath, statements.join(";\n") + ";\n");
let ok = 0;
try {
  const target = remote ? "--remote -y" : "--local --persist-to ../.wrangler-shared";
  execSync(`npx wrangler d1 execute ${dbName} ${target} --file .seed-bepro.tmp.sql`, { cwd: root, stdio: "pipe" });
  ok = statements.length;
} catch (err) {
  console.error(`[seed-bepro] ✗ ${err.stdout?.toString() ?? ""}${err.stderr?.toString() ?? err.message}`);
} finally {
  unlinkSync(sqlPath);
}
console.log(`\n[seed-bepro] ✓ ${ok}/${statements.length} statements executed\n`);
console.log(`  store      : ${storeId} (bepro)`);
console.log(`  categories : ${categories.length}`);
console.log(`  products   : ${products.length} (${products.filter((p) => p.storeFeatured).length} featured)`);
console.log(`  variants   : ${variants.length}`);
console.log(`  shipping   : 58 wilayas, domicile + stop desk`);
console.log(`\n  rawKey     : ${rawKey.slice(0, 24)}...`);
console.log(`\n  target     : ${remote ? `remote D1 (${dbName})` : "local D1 (.wrangler-shared)"}\n`);
if (ok !== statements.length) process.exitCode = 1;
