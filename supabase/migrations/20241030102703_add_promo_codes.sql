CREATE TABLE promo_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code VARCHAR(255) UNIQUE NOT NULL,
    percentage_discount NUMERIC NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    promo_code_id UUID REFERENCES promo_codes(id),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_item_code ON promo_keys (item_code);
CREATE INDEX idx_promo_code ON promo_codes (promo_code);

CREATE OR REPLACE FUNCTION mark_promo_as_redeemed() RETURNS TRIGGER AS $$
BEGIN
    UPDATE promo_codes
    SET is_redeemed = TRUE
    WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER redeem_promo_code_trigger
AFTER INSERT ON redemptions
FOR EACH ROW
EXECUTE FUNCTION mark_promo_as_redeemed();
