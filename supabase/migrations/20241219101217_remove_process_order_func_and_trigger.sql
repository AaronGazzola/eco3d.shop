DROP TRIGGER IF EXISTS trigger_process_print_order ON order_items;
DROP FUNCTION IF EXISTS process_print_order CASCADE;
ALTER TABLE product_variants DROP COLUMN stock_quantity;
ALTER TABLE product_variants DROP COLUMN group_size;