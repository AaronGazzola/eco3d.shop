ALTER TABLE promo_codes
ADD COLUMN promo_key_id UUID REFERENCES promo_keys(id);
