-- Add approval status to profiles.
-- Existing rows default to 'approved' so live accounts are not disrupted.
-- New band signups are set to 'pending' by the application after creation.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));
