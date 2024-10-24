CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered', 'payment_received', 'in_production', 'refunded');

CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'rejected', 'processed');

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    custom_attributes JSONB,
    estimated_print_time INTERVAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE pricing_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    price_per_item INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE print_time_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    print_time_per_item INTERVAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users (id),
    status order_status NOT NULL DEFAULT 'pending',
    total_price INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expected_fulfillment_date TIMESTAMP WITH TIME ZONE,
    is_custom BOOLEAN DEFAULT FALSE,
    recipient_name TEXT,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'AUD'
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders (id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants (id),
    quantity INTEGER NOT NULL,
    price_at_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE cart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users (id) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID REFERENCES cart (id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants (id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users (id),
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

CREATE TABLE print_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID REFERENCES order_items (id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    printer_id UUID,
    priority INTEGER DEFAULT 1,
    estimated_print_time INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id),
    refund_amount INTEGER NOT NULL,
    reason TEXT,
    status refund_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users (id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders (id),
    amount INTEGER NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders (id),
    event_type TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE shipping_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders (id),
    shipping_provider TEXT NOT NULL,
    tracking_number TEXT,
    shipping_status TEXT NOT NULL DEFAULT 'pending',
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users (id),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_variant_id ON order_items (product_variant_id);
CREATE INDEX idx_product_variants_product_id ON product_variants (product_id);
CREATE INDEX idx_print_queue_order_item_id ON print_queue (order_item_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX idx_cart_items_product_variant_id ON cart_items (product_variant_id);
CREATE INDEX idx_pricing_tiers_product_variant_id ON pricing_tiers (product_variant_id);
CREATE INDEX idx_print_time_tiers_product_variant_id ON print_time_tiers (product_variant_id);
CREATE INDEX idx_addresses_user_id ON addresses (user_id);
CREATE INDEX idx_refunds_order_id ON refunds (order_id);
CREATE INDEX idx_refunds_user_id ON refunds (user_id);
CREATE INDEX idx_payments_order_id ON payments (order_id);
CREATE INDEX idx_order_events_order_id ON order_events (order_id);
CREATE INDEX idx_shipping_details_order_id ON shipping_details (order_id);

CREATE OR REPLACE FUNCTION handle_payment_received() RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    tier RECORD;
    selected_price INTEGER;
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
                INSERT INTO print_queue (order_item_id, status, estimated_print_time, created_at)
                VALUES (
                    item.id,
                    'queued',
                    CASE
                        WHEN item.quantity > 1 AND tier IS NOT NULL THEN (SELECT print_time_per_item FROM print_time_tiers WHERE product_variant_id = item.product_variant_id AND min_quantity <= item.quantity ORDER BY min_quantity DESC LIMIT 1) * item.quantity
                        ELSE (SELECT estimated_print_time FROM product_variants WHERE id = item.product_variant_id) * item.quantity
                    END,
                    now()
                );
            END IF;
        END LOOP;

        DELETE FROM cart WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_refund() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        UPDATE orders
        SET status = 'refunded',
            updated_at = now()
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_refund
AFTER UPDATE ON refunds
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION handle_refund();

CREATE TRIGGER trigger_handle_payment_received
AFTER UPDATE OF status ON orders
FOR EACH ROW
WHEN (NEW.status = 'payment_received')
EXECUTE FUNCTION handle_payment_received();

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_products
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_product_variants
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_print_queue
BEFORE UPDATE ON print_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_cart
BEFORE UPDATE ON cart
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_cart_items
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_pricing_tiers
BEFORE UPDATE ON pricing_tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_print_time_tiers
BEFORE UPDATE ON print_time_tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_addresses
BEFORE UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_refunds
BEFORE UPDATE ON refunds
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_shipping_details
BEFORE UPDATE ON shipping_details
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
