-- Add foreign key constraints to ensure referential integrity

-- profiles.user_id references auth.users (source of truth)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- projects.user_id references profiles (application-level user)
ALTER TABLE public.projects
  ADD CONSTRAINT projects_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- published_designs.user_id references profiles (application-level user)
ALTER TABLE public.published_designs
  ADD CONSTRAINT published_designs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- published_designs.project_id references projects
ALTER TABLE public.published_designs
  ADD CONSTRAINT published_designs_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

-- print_orders.user_id references profiles (application-level user)
ALTER TABLE public.print_orders
  ADD CONSTRAINT print_orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- order_items.order_id references print_orders
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.print_orders(id)
  ON DELETE CASCADE;

-- order_items.user_id references profiles (application-level user)
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;

-- order_items.design_id references published_designs (nullable)
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_design_id_fkey
  FOREIGN KEY (design_id)
  REFERENCES public.published_designs(id)
  ON DELETE SET NULL;

-- design_reviews.design_id references published_designs
ALTER TABLE public.design_reviews
  ADD CONSTRAINT design_reviews_design_id_fkey
  FOREIGN KEY (design_id)
  REFERENCES public.published_designs(id)
  ON DELETE CASCADE;

-- design_reviews.reviewer_id references profiles (nullable)
ALTER TABLE public.design_reviews
  ADD CONSTRAINT design_reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- order_reviews.order_id references print_orders
ALTER TABLE public.order_reviews
  ADD CONSTRAINT order_reviews_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.print_orders(id)
  ON DELETE CASCADE;

-- order_reviews.reviewer_id references profiles (nullable)
ALTER TABLE public.order_reviews
  ADD CONSTRAINT order_reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;

-- shipping_tracking.order_id references print_orders
ALTER TABLE public.shipping_tracking
  ADD CONSTRAINT shipping_tracking_order_id_fkey
  FOREIGN KEY (order_id)
  REFERENCES public.print_orders(id)
  ON DELETE CASCADE;

-- shipping_tracking.user_id references profiles (application-level user)
ALTER TABLE public.shipping_tracking
  ADD CONSTRAINT shipping_tracking_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;
