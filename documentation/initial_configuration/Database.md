# Database

```sql
-- Create user_role enum type
-- Defines application-level roles stored in profiles.role column
-- These are NOT Postgres roles - they are checked in RLS policies using helper functions
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super-admin');

-- Create enum types
CREATE TYPE publication_status AS ENUM ('draft', 'pending', 'published', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'printing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE print_size AS ENUM ('small', 'medium', 'large', 'custom');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE shipping_status AS ENUM ('pending', 'shipped', 'delivered', 'returned');
CREATE TYPE contact_status AS ENUM ('unread', 'read', 'replied', 'archived');

-- Create tables
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  shipping_address JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  model_data JSONB NOT NULL,
  settings JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.published_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  preview_url TEXT NOT NULL,
  model_data JSONB NOT NULL,
  configuration JSONB,
  status publication_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.print_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  design_id UUID,
  size print_size NOT NULL,
  colors TEXT[] NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT unit_price_positive CHECK (unit_price >= 0)
);

CREATE TABLE public.design_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID NOT NULL,
  reviewer_id UUID,
  status review_status NOT NULL DEFAULT 'pending',
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.order_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  reviewer_id UUID,
  status review_status NOT NULL DEFAULT 'pending',
  price_adjustment DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.shipping_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  carrier TEXT NOT NULL,
  tracking_number TEXT NOT NULL,
  status shipping_status NOT NULL DEFAULT 'pending',
  tracking_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, tracking_number)
);

CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status contact_status NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT contact_submissions_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS helper function for admin role checks
-- SECURITY DEFINER: Runs with creator's permissions to read profiles
-- STABLE: Enables query-level caching for performance
-- Wrap calls in (SELECT ...) for proper caching: USING ((SELECT is_admin()))

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT (SELECT role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'super-admin');
$$;

-- Create trigger function for automatic profile creation
-- Automatically creates a profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NULL));
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create RLS Policies
-- Using native PostgreSQL roles: anon, authenticated
-- Admin policies use authenticated role with is_admin() function check

CREATE POLICY "profiles_select_anon"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "profiles_insert_authenticated"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_insert_admin"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "profiles_update_authenticated"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "profiles_delete_authenticated"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_admin"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "projects_select_anon"
  ON public.projects
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "projects_select_authenticated"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "projects_select_admin"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "projects_insert_authenticated"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_insert_admin"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "projects_update_authenticated"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_admin"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "projects_delete_authenticated"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_admin"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "published_designs_select_anon"
  ON public.published_designs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "published_designs_select_authenticated"
  ON public.published_designs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "published_designs_select_admin"
  ON public.published_designs
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "published_designs_insert_authenticated"
  ON public.published_designs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "published_designs_insert_admin"
  ON public.published_designs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "published_designs_update_authenticated"
  ON public.published_designs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "published_designs_update_admin"
  ON public.published_designs
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "published_designs_delete_authenticated"
  ON public.published_designs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "published_designs_delete_admin"
  ON public.published_designs
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "print_orders_select_anon"
  ON public.print_orders
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "print_orders_select_authenticated"
  ON public.print_orders
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "print_orders_select_admin"
  ON public.print_orders
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "print_orders_insert_authenticated"
  ON public.print_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "print_orders_insert_admin"
  ON public.print_orders
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "print_orders_update_authenticated"
  ON public.print_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "print_orders_update_admin"
  ON public.print_orders
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "print_orders_delete_authenticated"
  ON public.print_orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "print_orders_delete_admin"
  ON public.print_orders
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "order_items_select_anon"
  ON public.order_items
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "order_items_select_authenticated"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "order_items_select_admin"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "order_items_insert_authenticated"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items_insert_admin"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "order_items_update_authenticated"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items_update_admin"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "order_items_delete_authenticated"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "order_items_delete_admin"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "design_reviews_select_anon"
  ON public.design_reviews
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "design_reviews_select_authenticated"
  ON public.design_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "design_reviews_select_admin"
  ON public.design_reviews
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "design_reviews_insert_admin"
  ON public.design_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "design_reviews_update_admin"
  ON public.design_reviews
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "design_reviews_delete_admin"
  ON public.design_reviews
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "order_reviews_select_anon"
  ON public.order_reviews
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "order_reviews_select_authenticated"
  ON public.order_reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "order_reviews_select_admin"
  ON public.order_reviews
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "order_reviews_insert_admin"
  ON public.order_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "order_reviews_update_admin"
  ON public.order_reviews
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "order_reviews_delete_admin"
  ON public.order_reviews
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "shipping_tracking_select_anon"
  ON public.shipping_tracking
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "shipping_tracking_select_authenticated"
  ON public.shipping_tracking
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "shipping_tracking_select_admin"
  ON public.shipping_tracking
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "shipping_tracking_insert_authenticated"
  ON public.shipping_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shipping_tracking_insert_admin"
  ON public.shipping_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "shipping_tracking_update_authenticated"
  ON public.shipping_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shipping_tracking_update_admin"
  ON public.shipping_tracking
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "shipping_tracking_delete_authenticated"
  ON public.shipping_tracking
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "shipping_tracking_delete_admin"
  ON public.shipping_tracking
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "contact_submissions_select_anon"
  ON public.contact_submissions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "contact_submissions_select_authenticated"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contact_submissions_select_admin"
  ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "contact_submissions_insert_admin"
  ON public.contact_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "contact_submissions_update_admin"
  ON public.contact_submissions
  FOR UPDATE
  TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "contact_submissions_delete_admin"
  ON public.contact_submissions
  FOR DELETE
  TO authenticated
  USING ((SELECT is_admin()));
```
