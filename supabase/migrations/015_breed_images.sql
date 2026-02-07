-- Create breed_images table for admin-uploaded breed images
CREATE TABLE IF NOT EXISTS breed_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id TEXT NOT NULL,
  breed_type TEXT NOT NULL CHECK (breed_type IN ('dog', 'cat')),
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Ensure unique ordering per breed
  UNIQUE (breed_id, display_order)
);

-- Create indexes
CREATE INDEX idx_breed_images_breed_id ON breed_images(breed_id);
CREATE INDEX idx_breed_images_breed_type ON breed_images(breed_type);

-- Enable RLS
ALTER TABLE breed_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read breed images
CREATE POLICY "Anyone can view breed images"
  ON breed_images FOR SELECT
  USING (true);

-- Policy: Only admins can insert breed images
CREATE POLICY "Admins can insert breed images"
  ON breed_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update breed images
CREATE POLICY "Admins can update breed images"
  ON breed_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete breed images
CREATE POLICY "Admins can delete breed images"
  ON breed_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_breed_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER breed_images_updated_at
  BEFORE UPDATE ON breed_images
  FOR EACH ROW
  EXECUTE FUNCTION update_breed_images_updated_at();
