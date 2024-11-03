ALTER TABLE public.product_variants
    RENAME COLUMN estimated_print_time TO estimated_print_seconds;

ALTER TABLE public.print_queue
    RENAME COLUMN estimated_print_time TO estimated_print_seconds;

-- Step 2: Change the type of estimated_print_seconds to NUMERIC
ALTER TABLE public.product_variants
    ALTER COLUMN estimated_print_seconds TYPE NUMERIC USING extract(epoch from estimated_print_seconds);

ALTER TABLE public.print_queue
    ALTER COLUMN estimated_print_seconds TYPE NUMERIC USING extract(epoch from estimated_print_seconds);

CREATE OR REPLACE FUNCTION handle_payment_received() RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    tier RECORD;
    selected_price INTEGER;
    shortest_queue_id UUID;
BEGIN
    IF NEW.status = 'payment_received' THEN
        FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
            SELECT * INTO tier FROM pricing_tiers
            WHERE product_variant_id = item.product_variant_id AND min_quantity <= item.quantity
            ORDER BY min_quantity DESC LIMIT 1;

            IF tier IS NOT NULL THEN
                selected_price := tier.price_per_item;
            ELSE
                selected_price := NULL;
            END IF;

            IF (SELECT stock_quantity FROM product_variants WHERE id = item.product_variant_id) >= item.quantity THEN
                UPDATE product_variants
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.product_variant_id;
            ELSE
                -- Assign to the shortest queue if not already assigned
                IF item.print_queue_id IS NULL THEN
                    SELECT id INTO shortest_queue_id
                    FROM print_queue
                    GROUP BY id
                    ORDER BY COUNT(*) ASC LIMIT 1;
                ELSE
                    shortest_queue_id := item.print_queue_id;
                END IF;

                INSERT INTO print_queue (order_item_id, status, estimated_print_seconds, created_at)
                VALUES (
                    item.id,
                    'queued',
                    CASE
                        WHEN item.quantity > 1 AND tier IS NOT NULL THEN 
                            (SELECT print_time_per_item FROM print_time_tiers WHERE product_variant_id = item.product_variant_id AND min_quantity <= item.quantity ORDER BY min_quantity DESC LIMIT 1) * item.quantity
                        ELSE 
                            (SELECT estimated_print_seconds FROM product_variants WHERE id = item.product_variant_id) * item.quantity
                    END,
                    now()
                )
                RETURNING id INTO item.print_queue_id;
            END IF;

            UPDATE order_items
            SET print_queue_id = item.print_queue_id
            WHERE id = item.id;
        END LOOP;

        DELETE FROM cart WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;