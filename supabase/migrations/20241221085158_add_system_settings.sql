CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add initial settings
INSERT INTO system_settings (key, value) 
VALUES ('order_notifications', '{"enabled": true, "emails": ["your@email.com"]}');

-- Policy to allow admin read/write
CREATE POLICY "Allow admin users to manage system settings"
ON system_settings
AS PERMISSIVE
FOR ALL 
TO authenticated
USING (
  (SELECT COUNT(*) FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin') > 0
)
WITH CHECK (
  (SELECT COUNT(*) FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin') > 0
);

ALTER TABLE profiles DROP COLUMN order_notifications;