-- XRoof Owner Portal — 20 Features SQL Migration
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════
-- #1 Dunning Management
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS dunning_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step INT NOT NULL DEFAULT 1, -- 1=day1, 2=day3, 3=day7
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recovered BOOLEAN DEFAULT false,
  recovered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dunning_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  day1_subject TEXT DEFAULT 'Your payment failed — please update your card',
  day1_body TEXT DEFAULT 'Hi {companyName}, we tried to charge your card but it was declined. Please update your payment method to keep your XRoof account active.',
  day3_subject TEXT DEFAULT 'Action needed: Your XRoof account will be paused in 4 days',
  day3_body TEXT DEFAULT 'Hi {companyName}, your payment is still failing. Your account will be paused in 4 days if not resolved. Update your payment method now.',
  day7_subject TEXT DEFAULT 'Your XRoof account has been paused',
  day7_body TEXT DEFAULT 'Hi {companyName}, your account has been paused due to a failed payment. Update your payment method to restore access.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #2 Cancellation Reason Survey
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- too_expensive, missing_features, not_enough_leads, competitor, seasonal_pause, other
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #3 Winback Campaigns
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS winback_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  discount_percent INT DEFAULT 50,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS winback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  days_after_cancel INT DEFAULT 30,
  discount_percent INT DEFAULT 50,
  subject TEXT DEFAULT 'We miss you! Come back to XRoof for 50% off',
  body TEXT DEFAULT 'Hi {companyName}, it''s been a month since you left XRoof. We''d love to have you back — here''s {discount}% off your first month back.',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #4 Revenue Goals
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS revenue_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL DEFAULT 'monthly', -- monthly, quarterly, annual
  target_amount INT NOT NULL DEFAULT 2000,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #5 NPS Responses
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 10),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nps_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  frequency_days INT DEFAULT 90,
  subject TEXT DEFAULT 'Quick question: How likely are you to recommend XRoof?',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #6 Admin Settings (scheduled reports, etc.)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #8 Custom Alert Rules
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- mrr_drop, idle_contractor, trial_inactive, churn, custom
  condition JSONB NOT NULL DEFAULT '{}', -- { "threshold": 10, "days": 3, etc. }
  notify_method TEXT NOT NULL DEFAULT 'email', -- email, push, both
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false
);

-- ═══════════════════════════════════════════════════
-- #11 Contractor Success Milestones
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS milestone_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- first_job, 10_jobs, first_payment, 50k_collected, etc.
  description TEXT NOT NULL,
  threshold INT NOT NULL DEFAULT 1,
  metric TEXT NOT NULL, -- jobs, invoices_paid, revenue, reports
  email_subject TEXT DEFAULT 'Congratulations! You hit a milestone on XRoof!',
  email_body TEXT DEFAULT 'Hi {companyName}, you just hit an amazing milestone: {milestoneName}!',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestone_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestone_definitions(id) ON DELETE CASCADE,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  UNIQUE(user_id, milestone_id)
);

-- ═══════════════════════════════════════════════════
-- #12 Referral Program
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  reward_type TEXT DEFAULT 'free_month', -- free_month, cash, credit
  reward_amount INT DEFAULT 0,
  rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #14 Changelog / What's New
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'feature', -- feature, improvement, fix, announcement
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS changelog_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id)
);

-- ═══════════════════════════════════════════════════
-- #15 Support Tickets
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender TEXT NOT NULL DEFAULT 'admin', -- admin, contractor
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #16 Usage Report Log
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS usage_report_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- '2026-03'
  jobs_created INT DEFAULT 0,
  invoices_sent INT DEFAULT 0,
  revenue_collected INT DEFAULT 0,
  reports_generated INT DEFAULT 0,
  automations_run INT DEFAULT 0,
  hours_saved NUMERIC(5,1) DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #17 Competitor Intelligence
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pricing TEXT DEFAULT '',
  strengths TEXT DEFAULT '',
  weaknesses TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  website TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- #19 Platform Costs (Unit Economics)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS platform_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- hosting, resend, twilio, stripe_fees, time, other
  monthly_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'infrastructure', -- infrastructure, marketing, labor, other
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- RLS — all admin-only tables
-- ═══════════════════════════════════════════════════
ALTER TABLE dunning_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE winback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_report_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_costs ENABLE ROW LEVEL SECURITY;

-- Service role full access for all tables
CREATE POLICY "Service role full access" ON dunning_sequences FOR ALL USING (true);
CREATE POLICY "Service role full access" ON dunning_settings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON cancellation_reasons FOR ALL USING (true);
CREATE POLICY "Service role full access" ON winback_campaigns FOR ALL USING (true);
CREATE POLICY "Service role full access" ON winback_settings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON revenue_goals FOR ALL USING (true);
CREATE POLICY "Service role full access" ON nps_responses FOR ALL USING (true);
CREATE POLICY "Service role full access" ON nps_settings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON admin_settings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON alert_rules FOR ALL USING (true);
CREATE POLICY "Service role full access" ON alert_history FOR ALL USING (true);
CREATE POLICY "Service role full access" ON milestone_definitions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON milestone_events FOR ALL USING (true);
CREATE POLICY "Service role full access" ON referral_codes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON referral_conversions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON changelog_entries FOR ALL USING (true);
CREATE POLICY "Service role full access" ON changelog_reads FOR ALL USING (true);
CREATE POLICY "Service role full access" ON support_tickets FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ticket_replies FOR ALL USING (true);
CREATE POLICY "Service role full access" ON usage_report_log FOR ALL USING (true);
CREATE POLICY "Service role full access" ON competitors FOR ALL USING (true);
CREATE POLICY "Service role full access" ON platform_costs FOR ALL USING (true);

-- Seed default milestone definitions
INSERT INTO milestone_definitions (name, description, threshold, metric) VALUES
  ('first_job', 'Created their first job', 1, 'jobs'),
  ('10_jobs', 'Created 10 jobs', 10, 'jobs'),
  ('50_jobs', 'Created 50 jobs', 50, 'jobs'),
  ('100_jobs', 'Created 100 jobs', 100, 'jobs'),
  ('first_payment', 'Received their first payment', 1, 'invoices_paid'),
  ('10_payments', 'Received 10 payments', 10, 'invoices_paid'),
  ('50_payments', 'Received 50 payments', 50, 'invoices_paid'),
  ('10k_revenue', 'Collected $10,000 in revenue', 10000, 'revenue'),
  ('50k_revenue', 'Collected $50,000 in revenue', 50000, 'revenue'),
  ('100k_revenue', 'Collected $100,000 in revenue', 100000, 'revenue'),
  ('first_report', 'Generated their first report', 1, 'reports'),
  ('10_reports', 'Generated 10 reports', 10, 'reports')
ON CONFLICT DO NOTHING;

-- Seed default dunning settings
INSERT INTO dunning_settings (enabled) VALUES (true) ON CONFLICT DO NOTHING;

-- Seed default winback settings
INSERT INTO winback_settings (enabled) VALUES (true) ON CONFLICT DO NOTHING;

-- Seed default NPS settings
INSERT INTO nps_settings (enabled) VALUES (true) ON CONFLICT DO NOTHING;
