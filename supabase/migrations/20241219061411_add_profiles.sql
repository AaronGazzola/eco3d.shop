CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE orders 
  DROP COLUMN IF EXISTS user_id,
  ADD COLUMN profile_id UUID REFERENCES profiles(id);

ALTER TABLE cart 
  DROP COLUMN IF EXISTS user_id,
  ADD COLUMN profile_id UUID REFERENCES profiles(id);

ALTER TABLE addresses 
  DROP COLUMN IF EXISTS user_id,
  ADD COLUMN profile_id UUID REFERENCES profiles(id);