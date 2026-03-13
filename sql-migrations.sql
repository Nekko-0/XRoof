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
