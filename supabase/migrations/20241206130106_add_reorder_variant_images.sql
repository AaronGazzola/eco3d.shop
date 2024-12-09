CREATE OR REPLACE FUNCTION reorder_variant_images(
  p_variant_image_id UUID,
  p_new_order INTEGER,
  p_variant_id UUID
) RETURNS VOID AS $$
DECLARE
  v_old_order INTEGER;
  v_max_order INTEGER;
BEGIN
  SELECT display_order, (SELECT MAX(display_order) FROM variant_images WHERE product_variant_id = p_variant_id)
  INTO v_old_order, v_max_order
  FROM variant_images 
  WHERE id = p_variant_image_id;

  UPDATE variant_images
  SET display_order = v_max_order + 10
  WHERE id = p_variant_image_id;

  IF v_old_order < p_new_order THEN
    UPDATE variant_images
    SET display_order = display_order - 1
    WHERE product_variant_id = p_variant_id
    AND display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
    UPDATE variant_images
    SET display_order = display_order + 1
    WHERE product_variant_id = p_variant_id
    AND display_order >= p_new_order
    AND display_order < v_old_order;
  END IF;

  UPDATE variant_images
  SET display_order = p_new_order
  WHERE id = p_variant_image_id;
END;
$$ LANGUAGE plpgsql;