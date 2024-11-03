ALTER TABLE public.print_queue
ALTER COLUMN estimated_print_time DROP NOT NULL,
ALTER COLUMN estimated_print_time SET DATA TYPE INTERVAL USING estimated_print_time::INTERVAL,
ALTER COLUMN estimated_print_time SET DEFAULT NULL;

ALTER TABLE public.product_variants
ALTER COLUMN estimated_print_time DROP NOT NULL,
ALTER COLUMN estimated_print_time SET DATA TYPE INTERVAL USING estimated_print_time::INTERVAL,
ALTER COLUMN estimated_print_time SET DEFAULT NULL;
