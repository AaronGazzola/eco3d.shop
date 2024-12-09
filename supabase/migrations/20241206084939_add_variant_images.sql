-- Remove product_variant_id from images table
ALTER TABLE images DROP COLUMN product_variant_id;
ALTER TABLE images DROP COLUMN display_order;

-- Create junction table for variant-image relationships
CREATE TABLE variant_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_variant_id, display_order)
);