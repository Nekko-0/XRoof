-- XRoof Database Migrations
-- Run these in Supabase SQL Editor

-- ============================================
-- From earlier sessions (may already exist)
-- ============================================

-- Scheduled automations table
CREATE TABLE IF NOT EXISTS scheduled_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES followup_templates(id) ON DELETE SET NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL,
  step_index int NOT NULL,
  action_type text NOT NULL,
  subject text,
  message text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Automation tracking on followups
ALTER TABLE followups ADD COLUMN IF NOT EXISTS automation_id uuid;

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id uuid NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  date date NOT NULL,
  time text,
  type text DEFAULT 'site_visit',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- New migrations (Phase 1-3)
-- ============================================

-- Customers table (CRM)
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Link jobs to customers (optional FK)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;

-- Job costs for profit tracking
CREATE TABLE IF NOT EXISTS job_costs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  amount decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Material prices in profile (jsonb)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS material_prices jsonb DEFAULT '{}';

-- Payment reminder tracking on invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_count int DEFAULT 0;

-- Google Calendar OAuth tokens
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false;

-- Team members (from earlier sessions, may already exist)
CREATE TABLE IF NOT EXISTS team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL,
  user_id uuid,
  invited_email text NOT NULL,
  invited_name text DEFAULT '',
  role text DEFAULT 'sales',
  status text DEFAULT 'invited',
  invite_token text,
  created_at timestamptz DEFAULT now()
);

-- Profiles parent_account_id for team members
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_account_id uuid;

-- Jobs assigned_to for team
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to uuid;

-- ============================================
-- Competitive Improvement Migrations
-- ============================================

-- Onboarding tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- SMS notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_notifications jsonb DEFAULT '{}';

-- Lead source attribution
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source_detail text;

-- Milestone payments on invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[]';

-- Report/proposal templates
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  name text NOT NULL,
  template_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Portal messaging between homeowner and contractor
CREATE TABLE IF NOT EXISTS portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  sender text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Custom email templates per contractor
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Deal Velocity: Stage Timestamps
-- ============================================

-- Track when each job transitions between stages
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimate_sent_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
-- Note: signed_at already exists on jobs table

-- ============================================
-- Settings Hub: Notification Preferences
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}';

-- ============================================
-- Job Costing: Performance Index
-- ============================================
CREATE INDEX IF NOT EXISTS idx_job_costs_job_id ON job_costs(job_id);

-- ============================================
-- Crew & Work Orders
-- ============================================
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL,
  assigned_to uuid REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_name text,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_contractor_id ON work_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);

-- ============================================
-- QuickBooks Integration
-- ============================================

-- QuickBooks OAuth tokens on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quickbooks_realm_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quickbooks_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quickbooks_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quickbooks_connected boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quickbooks_last_sync timestamptz;

-- Track which invoices have been synced to QuickBooks
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quickbooks_invoice_id text;

-- ============================================
-- Estimating Upgrades
-- ============================================

-- Line-item estimates (itemized breakdown)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS estimate_line_items jsonb;
-- Formal estimate acceptance
ALTER TABLE reports ADD COLUMN IF NOT EXISTS estimate_accepted boolean DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS estimate_accepted_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS accepted_tier_index int;

-- ============================================
-- PDF Proposals: Business details on profiles
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_number text;

-- ============================================
-- Customer Self-Booking
-- ============================================

-- Booking settings on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_hours jsonb DEFAULT '{"start":"09:00","end":"17:00","days":[1,2,3,4,5]}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_duration_min int DEFAULT 60;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS booking_buffer_min int DEFAULT 30;

-- Track who booked (customer vs contractor) on appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by text DEFAULT 'contractor';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_min int DEFAULT 60;

-- ============================================
-- Time & Labor Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS time_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id uuid NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  user_name text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes int,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Lead Source Landing Pages
-- ============================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Get Your Free Roof Estimate',
  subtitle text DEFAULT 'Professional roofing services you can trust.',
  cta_text text DEFAULT 'Get Free Estimate',
  hero_image_url text,
  template text DEFAULT 'standard',
  utm_source text,
  utm_campaign text,
  active boolean DEFAULT true,
  views int DEFAULT 0,
  conversions int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enhanced source tracking on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utm_source text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utm_medium text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS landing_page_id uuid;

-- ============================================
-- Insurance Claim Tracking
-- ============================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_insurance_claim boolean DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS insurance_company text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claim_number text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS adjuster_name text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS adjuster_phone text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS adjuster_email text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS deductible numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'pending';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS adjuster_meeting_date date;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS insurance_notes text;

-- ============================================
-- Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_contractor_id ON appointments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_customers_contractor_id ON customers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_contractor_id ON time_entries(contractor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_contractor_id ON work_orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_job_id ON work_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_contractor_id ON landing_pages(contractor_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_automations_status ON scheduled_automations(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_automations_contractor_id ON scheduled_automations(contractor_id);

-- ============================================
-- White-Label Branding Fields
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_tagline text;

-- ============================================
-- Two-Way SMS Messaging
-- ============================================

CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body text NOT NULL,
  customer_name text,
  twilio_sid text,
  status text DEFAULT 'delivered',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_contractor_id ON sms_messages(contractor_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_phone_number ON sms_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at);

-- ============================================
-- Google Reviews integration
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_reviews_cache JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_reviews_cached_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_google_reviews BOOLEAN DEFAULT true;

-- ============================================
-- Subscription & Seat Limits
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'pro';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_team_seats int DEFAULT 3;

-- ============================================
-- Storage bucket for report images & logos
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('report-images', 'report-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can read report images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-images');

CREATE POLICY "Authenticated users can upload report images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'report-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their report images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete their report images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'report-images' AND auth.role() = 'authenticated');

-- ============================================
-- Landing Page Redesign: Missing Columns
-- ============================================
-- CRITICAL: These columns were in the builder UI and Zod
-- validation but never existed in the database. Data was
-- silently lost on every save. Run this migration to fix.

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '["Roof Replacement","Storm Damage","Roof Repair","Free Inspection"]';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS trust_badges jsonb DEFAULT '["Free Estimates","5-Star Rated","24hr Response"]';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS testimonials jsonb DEFAULT '[]';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS stats jsonb DEFAULT '[]';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS color_scheme text DEFAULT 'brand';

-- Licensed & Insured certification on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS licensed_insured_certified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS licensed_insured_certified_at timestamptz;

-- ============================================
-- Landing Page Builder Improvements
-- ============================================

-- Tracking code fields
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS google_ads_id text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS google_ads_label text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS facebook_pixel_id text;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS google_analytics_id text;

-- Thank you page settings
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS thank_you_heading text DEFAULT 'Estimate Request Received!';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS thank_you_message text DEFAULT 'We''ll review your project details and get back to you within 24 hours with a free, no-obligation estimate.';
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS redirect_url text;

-- A/B headline testing
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS alt_headline text;

-- Lead tracking enhancements
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS project_description text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utm_term text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS utm_content text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS headline_variant text;

-- Landing page pricing section
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS pricing_tiers jsonb;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS includes_list text[];

-- ============================================
-- Row Level Security (RLS) — Defense in Depth
-- ============================================
-- API routes use service_role key (bypasses RLS).
-- These policies protect against direct anon-key access.
-- Run this AFTER all tables exist.

-- ── 1. Core tables with contractor_id ownership ──

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_jobs" ON jobs FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);
-- Anon insert for landing page lead capture (API uses service_role, but just in case)
CREATE POLICY "anon_insert_leads" ON jobs FOR INSERT TO anon
  WITH CHECK (source = 'landing_page');

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_customers" ON customers FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE scheduled_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_automations" ON scheduled_automations FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_appointments" ON appointments FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_sms" ON sms_messages FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_email_templates" ON email_templates FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_work_orders" ON work_orders FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_time_entries" ON time_entries FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_landing_pages" ON landing_pages FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);
-- Public read for rendered landing pages
CREATE POLICY "anon_read_active_landing_pages" ON landing_pages FOR SELECT TO anon
  USING (active = true);

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_surveys" ON satisfaction_surveys FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_documents" ON customer_documents FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_reminder_templates" ON reminder_templates FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_subcontractors" ON subcontractors FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_expenses" ON expenses FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

-- ── 2. Tables with id or user_id ownership ──

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_profile" ON profiles FOR ALL TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
-- Public read for landing page branding (company name, logo, phone)
CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT TO anon
  USING (true);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_subscription" ON subscriptions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_push_subs" ON push_subscriptions FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manage_team" ON team_members FOR ALL TO authenticated
  USING ((select auth.uid()) = account_id)
  WITH CHECK ((select auth.uid()) = account_id);

-- ── 3. Tables with job_id ownership (join through jobs) ──

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_reports" ON reports FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE job_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_job_costs" ON job_costs FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_job_photos" ON job_photos FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_portal_messages" ON portal_messages FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_contracts" ON contracts FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_invoices" ON invoices FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE material_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_material_selections" ON material_selections FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE job_subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_job_subs" ON job_subcontractors FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

ALTER TABLE document_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_doc_events" ON document_events FOR ALL TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE contractor_id = (select auth.uid())));

-- ── 4. Tables with contractor_id (from other migration files) ──

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_report_templates" ON report_templates FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contractor_own_job_templates" ON job_templates FOR ALL TO authenticated
  USING ((select auth.uid()) = contractor_id)
  WITH CHECK ((select auth.uid()) = contractor_id);

-- ── 5. Admin/platform tables (service_role only, no user policies) ──

ALTER TABLE churn_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_nudge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_nudge_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
