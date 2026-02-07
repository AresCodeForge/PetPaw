-- Create breed_overrides table for admin inline editing of breed encyclopedia content
-- Uses JSONB overlay pattern: only stores fields that have been edited by admin,
-- which are merged client-side with the static JSON base data.
CREATE TABLE IF NOT EXISTS breed_overrides (
  breed_id TEXT PRIMARY KEY,
  overrides JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on updated_at for sorting
CREATE INDEX idx_breed_overrides_updated_at ON breed_overrides(updated_at DESC);

-- Enable RLS
ALTER TABLE breed_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read breed overrides (public data)
CREATE POLICY "Anyone can view breed overrides"
  ON breed_overrides FOR SELECT
  USING (true);

-- Policy: Only admins can insert breed overrides
CREATE POLICY "Admins can insert breed overrides"
  ON breed_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can update breed overrides
CREATE POLICY "Admins can update breed overrides"
  ON breed_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only admins can delete breed overrides
CREATE POLICY "Admins can delete breed overrides"
  ON breed_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_breed_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER breed_overrides_updated_at
  BEFORE UPDATE ON breed_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_breed_overrides_updated_at();
