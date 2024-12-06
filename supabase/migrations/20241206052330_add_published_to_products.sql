ALTER TABLE products
ADD COLUMN published BOOLEAN DEFAULT false;

CREATE POLICY "Enable read access for published products" ON products
    FOR SELECT
    TO public
    USING (published = true);