-- 1. Create the `images` table with ordering and relationship to `product_variants`
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_variant_id, display_order)
);

-- 2. Add `primary_image_id` column to the `product_variants` table
ALTER TABLE product_variants
ADD COLUMN primary_image_id UUID REFERENCES images(id);
