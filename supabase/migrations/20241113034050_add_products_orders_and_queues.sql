-- Squashed Migration
-- Enum Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered', 'payment_received', 'in_production', 'refunded', 'at_checkout');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
        CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected', 'processed');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
    END IF;
END$$;

-- Tables
CREATE TABLE IF NOT EXISTS print_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    custom_attributes JSONB DEFAULT NULL,
    estimated_print_seconds NUMERIC,
    print_queue_id UUID REFERENCES print_queues(id),
    group_size INTEGER DEFAULT NULL,
    primary_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_variant_id, display_order)
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    price_per_item INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS print_time_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    print_time_per_item INTERVAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    status order_status NOT NULL DEFAULT 'pending',
    total_price INTEGER NOT NULL,
    expected_fulfillment_date TIMESTAMP WITH TIME ZONE,
    is_custom BOOLEAN DEFAULT FALSE,
    recipient_name TEXT,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    price_at_order INTEGER NOT NULL,
    print_queue_id UUID REFERENCES print_queues(id),
    status order_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES cart(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    recipient_name TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS print_queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    print_queue_id UUID REFERENCES print_queues(id),
    order_item_id UUID REFERENCES order_items(id),
    product_variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE,
    reserved_until TIMESTAMP DEFAULT (now() + interval '1 hour'),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    refund_amount INTEGER NOT NULL,
    reason TEXT,
    status refund_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    amount INTEGER NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    event_type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipping_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    shipping_provider TEXT NOT NULL,
    tracking_number TEXT,
    shipping_status TEXT NOT NULL DEFAULT 'pending',
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS promo_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code VARCHAR(255) UNIQUE NOT NULL,
    percentage_discount NUMERIC NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    promo_key_id UUID REFERENCES promo_keys(id),
    is_seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    promo_code_id UUID REFERENCES promo_codes(id),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_variant_id ON order_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_print_queue_order_item_id ON print_queue_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_variant_id ON cart_items(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_product_variant_id ON pricing_tiers(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_print_time_tiers_product_variant_id ON print_time_tiers(product_variant_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_details_order_id ON shipping_details(order_id);
CREATE INDEX IF NOT EXISTS idx_item_code ON promo_keys(item_code);
CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(promo_code);
CREATE INDEX IF NOT EXISTS idx_order_items_print_queue_id ON order_items(print_queue_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_print_queue_id ON product_variants(print_queue_id);

-- Policies and Triggers
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

CREATE OR REPLACE FUNCTION update_order_items_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE order_items
    SET status = NEW.status
    WHERE order_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_order_items_status
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
        IF NEW.status = 'pending' AND OLD.status = 'at_checkout' THEN
                UPDATE product_variants
        SET stock_quantity = stock_quantity + NEW.quantity
        WHERE id = NEW.product_variant_id;

                DELETE FROM print_queue_items
        WHERE order_item_id = NEW.id;

        RETURN NEW;
    END IF;

        IF NEW.status = 'at_checkout' AND OLD.status IS DISTINCT FROM NEW.status THEN
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
                WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE;

                IF v_unassigned_quantity > 0 THEN
                    IF v_unassigned_quantity >= v_remaining_quantity THEN
                        WITH cte AS (
                            SELECT id
                            FROM print_queue_items
                            WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE
                            LIMIT v_remaining_quantity
                        )
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id, reserved_until = now() + interval '1 hour'
                        WHERE id IN (SELECT id FROM cte);
                        RETURN NEW;
                    ELSE
                        UPDATE print_queue_items
                        SET order_item_id = NEW.id, reserved_until = now() + interval '1 hour'
                        WHERE product_variant_id = NEW.product_variant_id AND order_item_id IS NULL AND is_processed = FALSE;
                        v_remaining_quantity := v_remaining_quantity - v_unassigned_quantity;
                    END IF;
                END IF;
            END IF;

                        IF v_remaining_quantity > 0 THEN
                WHILE v_remaining_quantity > 0 LOOP
                    INSERT INTO print_queue_items (print_queue_id, order_item_id, product_variant_id, quantity, is_processed, reserved_until, created_at, updated_at)
                    VALUES (
                        COALESCE((SELECT print_queue_id FROM product_variants WHERE id = NEW.product_variant_id AND print_queue_id IS NOT NULL), (SELECT id FROM print_queues LIMIT 1)),
                        CASE WHEN v_remaining_quantity >= v_group_size THEN NEW.id ELSE NULL END,
                        NEW.product_variant_id,
                        LEAST(v_group_size, v_remaining_quantity),
                        FALSE,
                        now() + interval '1 hour',
                        now(),
                        now()
                    );

                    v_remaining_quantity := v_remaining_quantity - v_group_size;
                END LOOP;
            END IF;
        END IF;
    END IF;

        IF NEW.status = 'payment_received' AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE print_queue_items
        SET reserved_until = NULL
        WHERE order_item_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_process_print_order
AFTER UPDATE OF status ON order_items
FOR EACH ROW
WHEN (NEW.status = 'payment_received'::order_status OR NEW.status = 'at_checkout'::order_status OR NEW.status = 'pending'::order_status)
EXECUTE FUNCTION process_print_order();

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

CREATE OR REPLACE FUNCTION schedule_cleanup()
RETURNS VOID AS $$
BEGIN
    PERFORM pg_sleep(3600);
    PERFORM cleanup_expired_print_queue_items();
END;
$$ LANGUAGE plpgsql;
