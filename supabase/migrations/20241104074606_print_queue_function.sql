ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS group_size INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT NULL;

-- Rename print_queue to print_queues
ALTER TABLE print_queue RENAME TO print_queues;

-- Remove unnecessary fields from print_queues
ALTER TABLE print_queues
DROP COLUMN IF EXISTS estimated_print_seconds,
DROP COLUMN IF EXISTS order_item_id,
DROP COLUMN IF EXISTS printer_id,
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS status;

-- Create new print_queue_items table
CREATE TABLE print_queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    print_queue_id UUID REFERENCES print_queues(id),
    order_item_id UUID REFERENCES order_items(id),
    product_variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Grant admin users permission to upload files to the product-images bucket
CREATE POLICY "Allow admin users to upload files" 
ON storage.objects 
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (
    SELECT COUNT(*) 
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) > 0
);

-- Add status column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status order_status DEFAULT 'pending';

-- Create function to update order_items status when order status changes
CREATE OR REPLACE FUNCTION update_order_items_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE order_items
    SET status = NEW.status
    WHERE order_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_items_status
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_order_items_status();

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
    IF (NEW.status = 'payment_received' AND (OLD.status IS DISTINCT FROM NEW.status) AND NOT EXISTS (
        SELECT 1 FROM print_queue_items WHERE order_item_id = NEW.id AND is_processed = FALSE)) THEN
        
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

        -- Proceed to fulfill using print queue
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
                        SET order_item_id = NEW.id
                        WHERE id IN (SELECT id FROM cte);
                        v_remaining_quantity := 0;
                    ELSE
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id
                        WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE;
                        v_remaining_quantity := v_remaining_quantity - v_unassigned_quantity;
                    END IF;
                END IF;
            END IF;

            -- Step 2: Add new items to fulfill the remaining quantity
            IF v_remaining_quantity > 0 THEN
                WHILE v_remaining_quantity > 0 LOOP
                    INSERT INTO print_queue_items (print_queue_id, order_item_id, product_variant_id, quantity, is_processed, created_at, updated_at)
                    VALUES (
                        COALESCE((SELECT print_queue_id FROM product_variants WHERE id = NEW.product_variant_id AND print_queue_id IS NOT NULL), (SELECT id FROM print_queues LIMIT 1)),  -- Assuming there's only one print queue for now
                        CASE WHEN v_remaining_quantity >= v_group_size THEN NEW.id ELSE NULL END,
                        NEW.product_variant_id,
                        LEAST(v_group_size, v_remaining_quantity),
                        FALSE,
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

CREATE TRIGGER trigger_process_print_order
AFTER UPDATE OF status ON order_items
FOR EACH ROW
WHEN (NEW.status = 'payment_received')
EXECUTE FUNCTION process_print_order();
