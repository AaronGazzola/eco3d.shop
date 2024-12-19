-- Drop existing function
DROP FUNCTION IF EXISTS update_print_queue_items();

-- Create updated function with fixed time comparison
CREATE OR REPLACE FUNCTION update_print_queue_items() RETURNS void AS $$
DECLARE
  current_epoch bigint;
  items_json text;
  updated_ids text;
BEGIN
  -- Get current time in seconds
  current_epoch := EXTRACT(EPOCH FROM NOW())::bigint;

  WITH updated AS (
    UPDATE print_queue_items
    SET is_processed = true
    WHERE id IN (
      SELECT pqi.id
      FROM print_queue_items pqi
      JOIN product_variants pv ON pv.id = pqi.product_variant_id
      WHERE pqi.is_processed = false 
        AND pqi.print_started_seconds IS NOT NULL
        -- Only mark as processed if the estimated print time has elapsed since the start time
        AND (current_epoch - pqi.print_started_seconds) >= COALESCE(pv.estimated_print_seconds, 0)
    )
    RETURNING id
  )
  SELECT json_agg(id)::text INTO updated_ids FROM updated;

  IF updated_ids IS NOT NULL THEN
    RAISE NOTICE 'Updated items: %', updated_ids;
  ELSE
    RAISE NOTICE 'No items updated';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Ensure the cron job is still scheduled
SELECT cron.schedule('update-print-queue', '* * * * *', 'SELECT update_print_queue_items()');