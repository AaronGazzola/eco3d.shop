-- Create Attributes Table
CREATE TABLE IF NOT EXISTS attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('radio', 'checkbox', 'dropdown')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Attribute Options Table
CREATE TABLE IF NOT EXISTS attribute_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Modify Product Variants Table
ALTER TABLE product_variants
ADD COLUMN attributes JSONB NOT NULL DEFAULT '{}';

-- Add GIN Index for JSONB Queries on Attributes
CREATE INDEX IF NOT EXISTS idx_product_variants_attributes ON product_variants USING gin (attributes jsonb_path_ops);
