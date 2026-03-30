-- ============================================================
-- XRoof 15 Features Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. CHURN PREDICTION SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS churn_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low',
  factors JSONB DEFAULT '{}',
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_churn_scores_user ON churn_scores(user_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_scores_risk ON churn_scores(risk_level);

ALTER TABLE churn_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on churn_scores"
  ON churn_scores FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. REVENUE ATTRIBUTION (add column to profiles)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS attribution_source TEXT DEFAULT 'organic';

-- ============================================================
-- 3. TRIAL NUDGE SEQUENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS trial_nudge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INT NOT NULL,
  condition TEXT,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trial_nudge_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on trial_nudge_templates"
  ON trial_nudge_templates FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS trial_nudge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES trial_nudge_templates(id) ON DELETE SET NULL,
  day INT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nudge_log_user ON trial_nudge_log(user_id, day);

ALTER TABLE trial_nudge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on trial_nudge_log"
  ON trial_nudge_log FOR ALL USING (true) WITH CHECK (true);

-- Seed default trial nudge templates
INSERT INTO trial_nudge_templates (day, condition, subject, body_html) VALUES
(1, NULL, 'Welcome to XRoof — let''s get you set up!',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#1a1a2e;padding:32px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">Welcome to XRoof!</h1></div>
<div style="padding:32px;">
<p style="color:#333;font-size:16px;margin:0 0 16px;">Hi {name},</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Welcome aboard! Your 7-day free trial has started. Here''s how to make the most of it:</p>
<ul style="color:#555;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
<li><strong>Create your first job</strong> — Add a customer and address to get started</li>
<li><strong>Generate an estimate</strong> — Use our report builder to create professional proposals</li>
<li><strong>Send an invoice</strong> — Get paid faster with online payments</li>
<li><strong>Try the measure tool</strong> — Satellite roof measurements in seconds</li></ul>
<div style="text-align:center;margin:24px 0;">
<a href="https://xroof.io/contractor/dashboard" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Go to Dashboard</a></div>
<p style="color:#888;font-size:12px;text-align:center;margin:24px 0 0;">You have 7 days to explore everything XRoof has to offer.</p>
</div></div></div></body></html>'),

(2, 'no_job', 'Create your first job in XRoof',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#1a1a2e;padding:32px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">Ready to Create Your First Job?</h1></div>
<div style="padding:32px;">
<p style="color:#333;font-size:16px;margin:0 0 16px;">Hi {name},</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">The best way to see how XRoof can help your roofing business is to create your first job. It only takes 30 seconds — just add a customer name and address, and you''re ready to generate estimates, contracts, and invoices.</p>
<div style="text-align:center;margin:24px 0;">
<a href="https://xroof.io/contractor/leads" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Create Your First Job</a></div>
<p style="color:#888;font-size:12px;text-align:center;margin:24px 0 0;">5 days left in your trial.</p>
</div></div></div></body></html>'),

(4, 'no_invoice', 'Did you try invoicing in XRoof?',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#1a1a2e;padding:32px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">Get Paid Faster with XRoof</h1></div>
<div style="padding:32px;">
<p style="color:#333;font-size:16px;margin:0 0 16px;">Hi {name},</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">XRoof contractors collect payments 3x faster than the industry average. With online invoicing, your customers can pay by card, ACH, Zelle, Venmo, or CashApp — right from their phone.</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">Try creating an invoice from any job and see how easy it is to get paid.</p>
<div style="text-align:center;margin:24px 0;">
<a href="https://xroof.io/contractor/leads" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Create an Invoice</a></div>
<p style="color:#888;font-size:12px;text-align:center;margin:24px 0 0;">3 days left in your trial.</p>
</div></div></div></body></html>'),

(6, NULL, 'Your XRoof trial ends tomorrow',
'<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:32px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;">Your Trial Ends Tomorrow</h1></div>
<div style="padding:32px;">
<p style="color:#333;font-size:16px;margin:0 0 16px;">Hi {name},</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">Your 7-day XRoof trial ends tomorrow. After that, you''ll lose access to:</p>
<ul style="color:#555;font-size:14px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
<li>Professional estimates & proposals</li>
<li>Online invoicing & payments</li>
<li>Customer portal</li>
<li>Satellite roof measurements</li>
<li>Job pipeline & scheduling</li></ul>
<div style="background:#e8f5e9;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
<p style="color:#2e7d32;font-size:14px;margin:0 0 8px;">Subscribe today</p>
<p style="color:#1b5e20;font-size:28px;font-weight:800;margin:0;">$199/mo</p>
<p style="color:#2e7d32;font-size:13px;margin:8px 0 0;">or $169/mo billed annually (save 15%)</p></div>
<div style="text-align:center;margin:24px 0;">
<a href="https://xroof.io/contractor/billing" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Subscribe Now</a></div>
</div></div></div></body></html>');

-- ============================================================
-- 4. MATERIAL CATALOG
-- ============================================================
CREATE TABLE IF NOT EXISTS material_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  product_line TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_tier TEXT DEFAULT 'mid',
  material_type TEXT DEFAULT 'shingle',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_catalog_brand ON material_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_material_catalog_type ON material_catalog(material_type);

ALTER TABLE material_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on material_catalog"
  ON material_catalog FOR ALL USING (true) WITH CHECK (true);
-- Allow public read for portal access
CREATE POLICY "Public read on material_catalog"
  ON material_catalog FOR SELECT USING (true);

-- Contractor material preferences (hidden brands)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS material_preferences JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS material_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES material_catalog(id) ON DELETE CASCADE,
  selected_by TEXT NOT NULL DEFAULT 'contractor',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_selections_job ON material_selections(job_id);

ALTER TABLE material_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on material_selections"
  ON material_selections FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED MATERIAL CATALOG — Real Roofing Shingles
-- ============================================================

-- GAF Timberline HDZ (Lifetime Shingles)
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('GAF', 'Timberline HDZ', 'Charcoal', 'GAF Timberline HDZ Lifetime Architectural Shingles - Charcoal', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Weathered Wood', 'GAF Timberline HDZ Lifetime Architectural Shingles - Weathered Wood', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Hickory', 'GAF Timberline HDZ Lifetime Architectural Shingles - Hickory', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Shakewood', 'GAF Timberline HDZ Lifetime Architectural Shingles - Shakewood', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Barkwood', 'GAF Timberline HDZ Lifetime Architectural Shingles - Barkwood', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Pewter Gray', 'GAF Timberline HDZ Lifetime Architectural Shingles - Pewter Gray', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Slate', 'GAF Timberline HDZ Lifetime Architectural Shingles - Slate', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Mission Brown', 'GAF Timberline HDZ Lifetime Architectural Shingles - Mission Brown', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Hunter Green', 'GAF Timberline HDZ Lifetime Architectural Shingles - Hunter Green', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Oyster Gray', 'GAF Timberline HDZ Lifetime Architectural Shingles - Oyster Gray', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Birchwood', 'GAF Timberline HDZ Lifetime Architectural Shingles - Birchwood', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Fox Hollow Gray', 'GAF Timberline HDZ Lifetime Architectural Shingles - Fox Hollow Gray', 'mid', 'shingle'),
('GAF', 'Timberline HDZ', 'Appalachian Sky', 'GAF Timberline HDZ Lifetime Architectural Shingles - Appalachian Sky', 'mid', 'shingle');

-- GAF Timberline HD (Standard Architectural)
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('GAF', 'Timberline HD', 'Charcoal', 'GAF Timberline HD Architectural Shingles - Charcoal', 'economy', 'shingle'),
('GAF', 'Timberline HD', 'Weathered Wood', 'GAF Timberline HD Architectural Shingles - Weathered Wood', 'economy', 'shingle'),
('GAF', 'Timberline HD', 'Barkwood', 'GAF Timberline HD Architectural Shingles - Barkwood', 'economy', 'shingle'),
('GAF', 'Timberline HD', 'Pewter Gray', 'GAF Timberline HD Architectural Shingles - Pewter Gray', 'economy', 'shingle'),
('GAF', 'Timberline HD', 'Slate', 'GAF Timberline HD Architectural Shingles - Slate', 'economy', 'shingle'),
('GAF', 'Timberline HD', 'Hickory', 'GAF Timberline HD Architectural Shingles - Hickory', 'economy', 'shingle');

-- GAF Timberline UHDZ (Ultra Premium)
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('GAF', 'Timberline UHDZ', 'Charcoal', 'GAF Timberline UHDZ Ultra-Premium Architectural Shingles - Charcoal', 'premium', 'shingle'),
('GAF', 'Timberline UHDZ', 'Weathered Wood', 'GAF Timberline UHDZ Ultra-Premium Architectural Shingles - Weathered Wood', 'premium', 'shingle'),
('GAF', 'Timberline UHDZ', 'Pewter Gray', 'GAF Timberline UHDZ Ultra-Premium Architectural Shingles - Pewter Gray', 'premium', 'shingle'),
('GAF', 'Timberline UHDZ', 'Barkwood', 'GAF Timberline UHDZ Ultra-Premium Architectural Shingles - Barkwood', 'premium', 'shingle');

-- Owens Corning Duration
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Owens Corning', 'Duration', 'Onyx Black', 'Owens Corning Duration Architectural Shingles - Onyx Black', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Estate Gray', 'Owens Corning Duration Architectural Shingles - Estate Gray', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Driftwood', 'Owens Corning Duration Architectural Shingles - Driftwood', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Brownwood', 'Owens Corning Duration Architectural Shingles - Brownwood', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Teak', 'Owens Corning Duration Architectural Shingles - Teak', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Quarry Gray', 'Owens Corning Duration Architectural Shingles - Quarry Gray', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Sierra Gray', 'Owens Corning Duration Architectural Shingles - Sierra Gray', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Chateau Green', 'Owens Corning Duration Architectural Shingles - Chateau Green', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Harbor Blue', 'Owens Corning Duration Architectural Shingles - Harbor Blue', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Sand Dune', 'Owens Corning Duration Architectural Shingles - Sand Dune', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Desert Tan', 'Owens Corning Duration Architectural Shingles - Desert Tan', 'mid', 'shingle'),
('Owens Corning', 'Duration', 'Sedona Canyon', 'Owens Corning Duration Architectural Shingles - Sedona Canyon', 'mid', 'shingle');

-- Owens Corning TruDefinition Duration STORM
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Owens Corning', 'Duration STORM', 'Onyx Black', 'Owens Corning Duration STORM Impact-Resistant Shingles - Onyx Black', 'premium', 'shingle'),
('Owens Corning', 'Duration STORM', 'Estate Gray', 'Owens Corning Duration STORM Impact-Resistant Shingles - Estate Gray', 'premium', 'shingle'),
('Owens Corning', 'Duration STORM', 'Driftwood', 'Owens Corning Duration STORM Impact-Resistant Shingles - Driftwood', 'premium', 'shingle'),
('Owens Corning', 'Duration STORM', 'Brownwood', 'Owens Corning Duration STORM Impact-Resistant Shingles - Brownwood', 'premium', 'shingle');

-- CertainTeed Landmark
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('CertainTeed', 'Landmark', 'Moire Black', 'CertainTeed Landmark Architectural Shingles - Moire Black', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Georgetown Gray', 'CertainTeed Landmark Architectural Shingles - Georgetown Gray', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Weathered Wood', 'CertainTeed Landmark Architectural Shingles - Weathered Wood', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Heather Blend', 'CertainTeed Landmark Architectural Shingles - Heather Blend', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Burnt Sienna', 'CertainTeed Landmark Architectural Shingles - Burnt Sienna', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Pewter', 'CertainTeed Landmark Architectural Shingles - Pewter', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Driftwood', 'CertainTeed Landmark Architectural Shingles - Driftwood', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Hunter Green', 'CertainTeed Landmark Architectural Shingles - Hunter Green', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Cobblestone Gray', 'CertainTeed Landmark Architectural Shingles - Cobblestone Gray', 'mid', 'shingle'),
('CertainTeed', 'Landmark', 'Resawn Shake', 'CertainTeed Landmark Architectural Shingles - Resawn Shake', 'mid', 'shingle');

-- CertainTeed Landmark PRO
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('CertainTeed', 'Landmark PRO', 'Moire Black', 'CertainTeed Landmark PRO Max Def Shingles - Moire Black', 'premium', 'shingle'),
('CertainTeed', 'Landmark PRO', 'Georgetown Gray', 'CertainTeed Landmark PRO Max Def Shingles - Georgetown Gray', 'premium', 'shingle'),
('CertainTeed', 'Landmark PRO', 'Weathered Wood', 'CertainTeed Landmark PRO Max Def Shingles - Weathered Wood', 'premium', 'shingle'),
('CertainTeed', 'Landmark PRO', 'Pewterwood', 'CertainTeed Landmark PRO Max Def Shingles - Pewterwood', 'premium', 'shingle');

-- Atlas StormMaster Slate
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Atlas', 'StormMaster Slate', 'Charcoal', 'Atlas StormMaster Slate Impact-Resistant Shingles - Charcoal', 'premium', 'shingle'),
('Atlas', 'StormMaster Slate', 'Weathered Wood', 'Atlas StormMaster Slate Impact-Resistant Shingles - Weathered Wood', 'premium', 'shingle'),
('Atlas', 'StormMaster Slate', 'Pewter Gray', 'Atlas StormMaster Slate Impact-Resistant Shingles - Pewter Gray', 'premium', 'shingle'),
('Atlas', 'StormMaster Slate', 'Castle Gray', 'Atlas StormMaster Slate Impact-Resistant Shingles - Castle Gray', 'premium', 'shingle'),
('Atlas', 'StormMaster Slate', 'Sierra Brown', 'Atlas StormMaster Slate Impact-Resistant Shingles - Sierra Brown', 'premium', 'shingle'),
('Atlas', 'StormMaster Slate', 'Hearthstone Gray', 'Atlas StormMaster Slate Impact-Resistant Shingles - Hearthstone Gray', 'premium', 'shingle');

-- Atlas Pinnacle Pristine
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Atlas', 'Pinnacle Pristine', 'Charcoal', 'Atlas Pinnacle Pristine Architectural Shingles - Charcoal', 'mid', 'shingle'),
('Atlas', 'Pinnacle Pristine', 'Weathered Wood', 'Atlas Pinnacle Pristine Architectural Shingles - Weathered Wood', 'mid', 'shingle'),
('Atlas', 'Pinnacle Pristine', 'Pewter Gray', 'Atlas Pinnacle Pristine Architectural Shingles - Pewter Gray', 'mid', 'shingle'),
('Atlas', 'Pinnacle Pristine', 'Desert Shake', 'Atlas Pinnacle Pristine Architectural Shingles - Desert Shake', 'mid', 'shingle'),
('Atlas', 'Pinnacle Pristine', 'Pristine Black', 'Atlas Pinnacle Pristine Architectural Shingles - Pristine Black', 'mid', 'shingle');

-- IKO Cambridge
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('IKO', 'Cambridge', 'Charcoal Gray', 'IKO Cambridge Architectural Shingles - Charcoal Gray', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Weatherwood', 'IKO Cambridge Architectural Shingles - Weatherwood', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Driftwood', 'IKO Cambridge Architectural Shingles - Driftwood', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Dual Black', 'IKO Cambridge Architectural Shingles - Dual Black', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Harvard Slate', 'IKO Cambridge Architectural Shingles - Harvard Slate', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Aged Redwood', 'IKO Cambridge Architectural Shingles - Aged Redwood', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Earthtone Cedar', 'IKO Cambridge Architectural Shingles - Earthtone Cedar', 'economy', 'shingle'),
('IKO', 'Cambridge', 'Dual Gray', 'IKO Cambridge Architectural Shingles - Dual Gray', 'economy', 'shingle');

-- IKO Dynasty
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('IKO', 'Dynasty', 'Glacier', 'IKO Dynasty Performance Shingles - Glacier', 'mid', 'shingle'),
('IKO', 'Dynasty', 'Sedona', 'IKO Dynasty Performance Shingles - Sedona', 'mid', 'shingle'),
('IKO', 'Dynasty', 'Shadow Black', 'IKO Dynasty Performance Shingles - Shadow Black', 'mid', 'shingle'),
('IKO', 'Dynasty', 'Brownstone', 'IKO Dynasty Performance Shingles - Brownstone', 'mid', 'shingle');

-- Tamko Heritage
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Tamko', 'Heritage', 'Rustic Black', 'Tamko Heritage Architectural Shingles - Rustic Black', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Weathered Wood', 'Tamko Heritage Architectural Shingles - Weathered Wood', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Thunderstorm Gray', 'Tamko Heritage Architectural Shingles - Thunderstorm Gray', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Mountain Slate', 'Tamko Heritage Architectural Shingles - Mountain Slate', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Rustic Cedar', 'Tamko Heritage Architectural Shingles - Rustic Cedar', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Natural Timber', 'Tamko Heritage Architectural Shingles - Natural Timber', 'economy', 'shingle'),
('Tamko', 'Heritage', 'Aged Wood', 'Tamko Heritage Architectural Shingles - Aged Wood', 'economy', 'shingle');

-- Tamko Titan XT
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Tamko', 'Titan XT', 'Rustic Black', 'Tamko Titan XT Impact-Resistant Shingles - Rustic Black', 'premium', 'shingle'),
('Tamko', 'Titan XT', 'Weathered Wood', 'Tamko Titan XT Impact-Resistant Shingles - Weathered Wood', 'premium', 'shingle'),
('Tamko', 'Titan XT', 'Thunderstorm Gray', 'Tamko Titan XT Impact-Resistant Shingles - Thunderstorm Gray', 'premium', 'shingle');

-- Home Depot (HDX / private label options commonly available)
INSERT INTO material_catalog (brand, product_line, color, description, price_tier, material_type) VALUES
('Home Depot', 'GAF Timberline HDZ', 'Charcoal', 'Home Depot — GAF Timberline HDZ - Charcoal (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'GAF Timberline HDZ', 'Weathered Wood', 'Home Depot — GAF Timberline HDZ - Weathered Wood (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'GAF Timberline HDZ', 'Pewter Gray', 'Home Depot — GAF Timberline HDZ - Pewter Gray (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'GAF Timberline HDZ', 'Hickory', 'Home Depot — GAF Timberline HDZ - Hickory (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'OC Duration', 'Onyx Black', 'Home Depot — Owens Corning Duration - Onyx Black (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'OC Duration', 'Estate Gray', 'Home Depot — Owens Corning Duration - Estate Gray (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'OC Duration', 'Driftwood', 'Home Depot — Owens Corning Duration - Driftwood (Available at Home Depot)', 'mid', 'shingle'),
('Home Depot', 'OC Duration', 'Brownwood', 'Home Depot — Owens Corning Duration - Brownwood (Available at Home Depot)', 'mid', 'shingle');

-- ============================================================
-- 5. SUBCONTRACTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  hourly_rate DECIMAL(10,2),
  insurance_expiry DATE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_contractor ON subcontractors(contractor_id);

ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on subcontractors"
  ON subcontractors FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS job_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE job_subcontractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on job_subcontractors"
  ON job_subcontractors FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. SATISFACTION SURVEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL,
  token UUID DEFAULT gen_random_uuid(),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  submitted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  google_review_prompted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_token ON satisfaction_surveys(token);
CREATE INDEX IF NOT EXISTS idx_survey_job ON satisfaction_surveys(job_id);

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on satisfaction_surveys"
  ON satisfaction_surveys FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. REMINDER TEMPLATES (Smart Payment Reminders)
-- ============================================================
CREATE TABLE IF NOT EXISTS reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  step INT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  include_late_fee_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contractor_id, step)
);

ALTER TABLE reminder_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on reminder_templates"
  ON reminder_templates FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. CUSTOMER DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  uploaded_by TEXT NOT NULL DEFAULT 'homeowner',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_docs_job ON customer_documents(job_id);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on customer_documents"
  ON customer_documents FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 9. MULTI-LANGUAGE SUPPORT
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='preferred_language') THEN
    ALTER TABLE customers ADD COLUMN preferred_language TEXT DEFAULT 'en';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='preferred_language') THEN
    ALTER TABLE jobs ADD COLUMN preferred_language TEXT DEFAULT 'en';
  END IF;
END $$;

-- ============================================================
-- 10. EXPENSES (Receipt Scanner)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  contractor_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vendor TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT DEFAULT 'materials',
  description TEXT,
  receipt_url TEXT,
  ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_contractor ON expenses(contractor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on expenses"
  ON expenses FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE
-- ============================================================
