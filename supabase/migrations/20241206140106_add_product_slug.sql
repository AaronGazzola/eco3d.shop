-- 20241207000000_add_slug_to_products.sql
ALTER TABLE products
ADD COLUMN slug TEXT UNIQUE;

CREATE INDEX idx_products_slug ON products(slug);

-- Backfill existing products with slugs based on name
UPDATE products 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'));