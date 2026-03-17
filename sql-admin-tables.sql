-- XRoof Owner Portal — Admin Tables
-- Run this in Supabase SQL Editor

-- Contractor notes (internal CRM for platform owner)
CREATE TABLE IF NOT EXISTS admin_notes (
  contractor_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform announcements (banner shown to all contractors)
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies (admin-only access)
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API routes with service key)
CREATE POLICY "Service role full access" ON admin_notes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON platform_announcements FOR ALL USING (true);
