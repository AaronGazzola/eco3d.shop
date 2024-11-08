-- 1. Add the column `reserved_until` to `print_queue_items` table with a default value of one hour from the time of creation
ALTER TABLE print_queue_items
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP DEFAULT (now() + interval '1 hour');

-- 3. Create a cleanup function to remove print queue items where `reserved_until` is non-null and has passed, and update order status from 'at_checkout' to 'pending'
CREATE OR REPLACE FUNCTION cleanup_expired_print_queue_items()
RETURNS VOID AS $$
BEGIN
    UPDATE order_items
    SET status = 'pending'
    WHERE id IN (
        SELECT order_item_id
        FROM print_queue_items
        WHERE reserved_until IS NOT NULL
        AND reserved_until < now()
    ) AND status = 'at_checkout';

    DELETE FROM print_queue_items
    WHERE reserved_until IS NOT NULL
    AND reserved_until < now();
END;
$$ LANGUAGE plpgsql;

-- 4. Schedule the cleanup function to run periodically (e.g., every hour)
CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS VOID AS $$
BEGIN
    PERFORM pg_sleep(3600);
    PERFORM cleanup_expired_print_queue_items();
END;
$$ LANGUAGE plpgsql;

-- 5. Update the trigger to also run when order status changes to 'at_checkout'
DROP TRIGGER IF EXISTS trigger_process_print_order ON order_items;

-- To prevent issues with unsafe use of new enum values, drop the trigger if it already exists, and then recreate it.
CREATE TRIGGER trigger_process_print_order
AFTER UPDATE OF status ON order_items
FOR EACH ROW
WHEN (NEW.status = 'payment_received'::order_status OR NEW.status = 'at_checkout'::order_status)
EXECUTE FUNCTION process_print_order();

-- 6. Update the process_print_order function to handle different scenarios based on order status
CREATE OR REPLACE FUNCTION process_print_order()
RETURNS TRIGGER AS $$
DECLARE
    v_remaining_quantity INTEGER;
    v_group_size INTEGER;
    v_unassigned_quantity INTEGER;
    v_print_queue_id UUID;
    v_stock_quantity INTEGER;
BEGIN
    -- Ensure the function only runs if no unprocessed items are in the queue for this order_item_id
    IF ((NEW.status = 'payment_received' OR NEW.status = 'at_checkout') AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
        SELECT COALESCE(group_size, 0), COALESCE(stock_quantity, 0) 
        INTO v_group_size, v_stock_quantity
        FROM product_variants 
        WHERE id = NEW.product_variant_id;

        v_remaining_quantity := NEW.quantity;

        -- Step 0: Deduct available stock from product_variants.stock_quantity
        IF v_stock_quantity > 0 THEN
            IF v_stock_quantity >= v_remaining_quantity THEN
                -- Deduct the full remaining quantity from stock
                UPDATE product_variants
                SET stock_quantity = stock_quantity - v_remaining_quantity
                WHERE id = NEW.product_variant_id;

                v_remaining_quantity := 0;
            ELSE
                -- Deduct whatever is available in stock
                UPDATE product_variants
                SET stock_quantity = 0
                WHERE id = NEW.product_variant_id;

                v_remaining_quantity := v_remaining_quantity - v_stock_quantity;
            END IF;
        END IF;

        -- Proceed to fulfill using print queue if quantity remains
        IF v_remaining_quantity > 0 THEN
            -- Step 1: Check for any unassigned items in the print_queue_items that can be used
            IF v_group_size > 0 THEN
                SELECT COALESCE(SUM(quantity), 0) INTO v_unassigned_quantity
                FROM print_queue_items
                WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE;

                -- Use unassigned items to fulfill the current order
                IF v_unassigned_quantity > 0 THEN
                    IF v_unassigned_quantity >= v_remaining_quantity THEN
                        WITH cte AS (
                            SELECT id
                            FROM print_queue_items
                            WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE
                            LIMIT v_remaining_quantity
                        )
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id, reserved_until = NULL
                        WHERE id IN (SELECT id FROM cte);
                        v_remaining_quantity := 0;
                    ELSE
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id, reserved_until = NULL
                        WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE;
                        v_remaining_quantity := v_remaining_quantity - v_unassigned_quantity;
                    END IF;
                END IF;
            END IF;

            -- Step 2: Add new items to fulfill the remaining quantity
            IF v_remaining_quantity > 0 THEN
                WHILE v_remaining_quantity > 0 LOOP
                    INSERT INTO print_queue_items (print_queue_id, order_item_id, product_variant_id, quantity, is_processed, reserved_until, created_at, updated_at)
                    VALUES (
                        COALESCE((SELECT print_queue_id FROM product_variants WHERE id = NEW.product_variant_id AND print_queue_id IS NOT NULL), (SELECT id FROM print_queues LIMIT 1)),  -- Assuming there's only one print queue for now
                        CASE WHEN v_remaining_quantity >= v_group_size THEN NEW.id ELSE NULL END,
                        NEW.product_variant_id,
                        LEAST(v_group_size, v_remaining_quantity),
                        FALSE,
                        CASE WHEN NEW.status = 'payment_received' THEN NULL ELSE now() + interval '1 hour' END,
                        now(),
                        now()
                    );

                    v_remaining_quantity := v_remaining_quantity - v_group_size;
                END LOOP;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
