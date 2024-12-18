-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS trigger_update_order_items_status ON orders;
DROP TRIGGER IF EXISTS trigger_process_print_order ON order_items;
DROP FUNCTION IF EXISTS update_order_items_status CASCADE;
DROP FUNCTION IF EXISTS process_print_order CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_print_queue_items CASCADE;
DROP FUNCTION IF EXISTS schedule_cleanup CASCADE;

-- Update enum and convert columns
ALTER TYPE order_status RENAME TO order_status_old;
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered', 'payment_received', 'in_production', 'refunded');

ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders 
  ALTER COLUMN status TYPE order_status 
  USING (CASE 
    WHEN status::text = 'at_checkout' THEN 'pending'::order_status 
    ELSE status::text::order_status 
  END);
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;

ALTER TABLE order_items ALTER COLUMN status DROP DEFAULT;
ALTER TABLE order_items 
  ALTER COLUMN status TYPE order_status 
  USING (CASE 
    WHEN status::text = 'at_checkout' THEN 'pending'::order_status 
    ELSE status::text::order_status 
  END);
ALTER TABLE order_items ALTER COLUMN status SET DEFAULT 'pending'::order_status;

DROP TYPE order_status_old;

-- Cleanup unused columns
ALTER TABLE product_variants DROP COLUMN primary_image_id;
ALTER TABLE print_queue_items DROP COLUMN reserved_until;

-- Recreate triggers and functions
CREATE OR REPLACE FUNCTION update_order_items_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE order_items
    SET status = NEW.status
    WHERE order_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_print_order()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining_quantity INTEGER;
    v_group_size INTEGER;
    v_unassigned_quantity INTEGER;
    v_print_queue_id UUID;
    v_stock_quantity INTEGER;
BEGIN
    IF NEW.status = 'payment_received' AND OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT COALESCE(group_size, 0), COALESCE(stock_quantity, 0) 
        INTO v_group_size, v_stock_quantity
        FROM product_variants 
        WHERE id = NEW.product_variant_id;

        v_remaining_quantity := NEW.quantity;

        IF v_stock_quantity > 0 THEN
            IF v_stock_quantity >= v_remaining_quantity THEN
                UPDATE product_variants
                SET stock_quantity = stock_quantity - v_remaining_quantity
                WHERE id = NEW.product_variant_id;
                RETURN NEW;
            ELSE
                UPDATE product_variants
                SET stock_quantity = 0
                WHERE id = NEW.product_variant_id;
                v_remaining_quantity := v_remaining_quantity - v_stock_quantity;
            END IF;
        END IF;

        IF v_remaining_quantity > 0 THEN
            IF v_group_size > 0 THEN
                SELECT COALESCE(SUM(quantity), 0) INTO v_unassigned_quantity
                FROM print_queue_items
                WHERE product_variant_id = NEW.product_variant_id 
                AND order_item_id IS NULL 
                AND is_processed = FALSE;

                IF v_unassigned_quantity > 0 THEN
                    IF v_unassigned_quantity >= v_remaining_quantity THEN
                        WITH cte AS (
                            SELECT id
                            FROM print_queue_items
                            WHERE product_variant_id = NEW.product_variant_id 
                            AND order_item_id IS NULL 
                            AND is_processed = FALSE
                            LIMIT v_remaining_quantity
                        )
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id
                        WHERE id IN (SELECT id FROM cte);
                        RETURN NEW;
                    ELSE
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id
                        WHERE product_variant_id = NEW.product_variant_id 
                        AND order_item_id IS NULL 
                        AND is_processed = FALSE;
                        v_remaining_quantity := v_remaining_quantity - v_unassigned_quantity;
                    END IF;
                END IF;
            END IF;

            IF v_remaining_quantity > 0 THEN
                WHILE v_remaining_quantity > 0 LOOP
                    INSERT INTO print_queue_items (
                        print_queue_id, 
                        order_item_id, 
                        product_variant_id, 
                        quantity, 
                        is_processed
                    )
                    VALUES (
                        COALESCE(
                            (SELECT print_queue_id FROM product_variants WHERE id = NEW.product_variant_id AND print_queue_id IS NOT NULL), 
                            (SELECT id FROM print_queues LIMIT 1)
                        ),
                        NEW.id,
                        NEW.product_variant_id,
                        LEAST(v_group_size, v_remaining_quantity),
                        FALSE
                    );
                    v_remaining_quantity := v_remaining_quantity - v_group_size;
                END LOOP;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_items_status
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_items_status();

CREATE TRIGGER trigger_process_print_order
AFTER UPDATE OF status ON order_items
FOR EACH ROW
WHEN (NEW.status = 'payment_received'::order_status)
EXECUTE FUNCTION process_print_order();