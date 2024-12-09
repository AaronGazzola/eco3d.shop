CREATE OR REPLACE FUNCTION reorder_images(
  p_image_id UUID,
  p_new_order INTEGER,
  p_variant_id UUID
) RETURNS VOID AS $$
DECLARE
  v_old_order INTEGER;
  v_max_order INTEGER;
BEGIN
  -- Get the current display_order and max order
  SELECT display_order, (SELECT MAX(display_order) FROM images WHERE product_variant_id = p_variant_id)
  INTO v_old_order, v_max_order
  FROM images 
  WHERE id = p_image_id;

  -- First move to temporary position beyond max to avoid conflicts
  UPDATE images
  SET display_order = v_max_order + 10
  WHERE id = p_image_id;

  -- Then shift other images
  IF v_old_order < p_new_order THEN
    UPDATE images
    SET display_order = display_order - 1
    WHERE product_variant_id = p_variant_id
    AND display_order > v_old_order
    AND display_order <= p_new_order;
  ELSE
    UPDATE images
    SET display_order = display_order + 1
    WHERE product_variant_id = p_variant_id
    AND display_order >= p_new_order
    AND display_order < v_old_order;
  END IF;

  -- Finally set the target position
  UPDATE images
  SET display_order = p_new_order
  WHERE id = p_image_id;
END;
$$ LANGUAGE plpgsql;