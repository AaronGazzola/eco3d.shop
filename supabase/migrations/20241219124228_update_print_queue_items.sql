CREATE OR REPLACE FUNCTION update_print_queue_items() RETURNS void AS $$
BEGIN
  UPDATE print_queue_items
  SET is_processed = true
  WHERE is_processed = false 
  AND created_at + (INTERVAL '1 second' * (
    SELECT estimated_print_seconds 
    FROM product_variants 
    WHERE id = product_variant_id
  )) < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('update-print-queue', '* * * * *', 'SELECT update_print_queue_items()');