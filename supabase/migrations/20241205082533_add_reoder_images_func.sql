CREATE OR REPLACE FUNCTION reorder_images(
  p_image_id UUID,
  p_new_order INTEGER,
  p_variant_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE images
  SET display_order = 
    CASE 
      WHEN id = p_image_id THEN p_new_order
      WHEN display_order >= p_new_order THEN display_order + 1
      ELSE display_order
    END
  WHERE product_variant_id = p_variant_id
  AND display_order >= p_new_order;
END;
$$ LANGUAGE plpgsql;