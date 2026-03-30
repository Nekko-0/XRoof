"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/lib/toast-context"
import { useRole } from "@/lib/role-context"
import {
  Building2, Phone, Mail, MapPin, Star, DollarSign,
  Palette, Upload, Link2, Calendar, CreditCard, MessageSquare,
  Bell, Save, CheckCircle, ExternalLink, Settings, Download, Database, AlarmClock, Shield, ClipboardList, Trash2, Plus, Gift, Copy, Check, Sun, Moon,
} from "lucide-react"

type BookingHours = { start: string; end: string; days: number[] }

type SettingsProfile = {
  company_name: string
  company_tagline: string
  phone: string
  email: string
  service_zips: string[]
  google_review_url: string
  google_place_id: string
  widget_color: string
  logo_url: string
  widget_price_per_sqft: number | null
  estimate_prices: Record<string, number> | null
  sms_notifications: Record<string, boolean>
  google_calendar_connected: boolean
  quickbooks_connected: boolean
  quickbooks_last_sync: string | null
  notification_preferences: NotificationPreferences
  booking_enabled: boolean
  booking_hours: BookingHours
  booking_duration_min: number
  booking_buffer_min: number
  warranty_enabled: boolean
  warranty_years: number
  warranty_terms: string
}

type NotificationPreferences = {
  email: Record<string, boolean>
  sms: Record<string, boolean>
}

const TABS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "scheduling", label: "Scheduling", icon: Calendar },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "email-templates", label: "Templates", icon: Mail },
  { id: "reminders", label: "Reminders", icon: AlarmClock },
  { id: "warranty", label: "Warranty", icon: Shield },
  { id: "templates", label: "Templates", icon: ClipboardList },
  { id: "referral", label: "Referral", icon: Gift },
  { id: "data", label: "Data", icon: Database },
] as const

type TabId = (typeof TABS)[number]["id"]

const NOTIFICATION_EVENTS = [
  { key: "new_lead", label: "New Lead Assigned", description: "When a new lead is assigned to you" },
  { key: "estimate_viewed", label: "Estimate Viewed", description: "When a customer opens your estimate" },
  { key: "contract_signed", label: "Contract Signed", description: "When a customer signs a contract" },
  { key: "payment_received", label: "Payment Received", description: "When a payment is completed" },
  { key: "job_scheduled", label: "Job Scheduled", description: "Reminders for upcoming scheduled jobs" },
  { key: "review_received", label: "Review Received", description: "When a customer leaves a review" },
]

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { accountId, loading: roleLoading } = useRole()

  const tabParam = searchParams.get("tab") as TabId | null
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : "general")
  const [profile, setProfile] = useState<SettingsProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean
    charges_enabled?: boolean
    payouts_enabled?: boolean
  } | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)

  const switchTab = useCallback((tab: TabId) => {
    setActiveTab(tab)
    router.replace(`/contractor/settings?tab=${tab}`, { scroll: false })
  }, [router])

  // Load profile
  useEffect(() => {
    if (roleLoading || !accountId) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, company_tagline, phone, email, service_zips, google_review_url, google_place_id, widget_color, logo_url, widget_price_per_sqft, estimate_prices, sms_notifications, google_calendar_connected, quickbooks_connected, quickbooks_last_sync, notification_preferences, booking_enabled, booking_hours, booking_duration_min, booking_buffer_min, warranty_enabled, warranty_years, warranty_terms")
        .eq("id", accountId)
        .single()

      if (error || !data) {
        setProfile({
          company_name: "", company_tagline: "", phone: "", email: "", service_zips: [],
          google_review_url: "", google_place_id: "", widget_color: "#059669", logo_url: "",
          widget_price_per_sqft: null, estimate_prices: null, sms_notifications: {},
          google_calendar_connected: false, quickbooks_connected: false, quickbooks_last_sync: null,
          notification_preferences: { email: {}, sms: {} },
          booking_enabled: false, booking_hours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
          booking_duration_min: 60, booking_buffer_min: 30,
          warranty_enabled: false, warranty_years: 1, warranty_terms: "",
        })
      } else {
        setProfile({
          company_name: data.company_name || "",
          company_tagline: data.company_tagline || "",
          phone: data.phone || "",
          email: data.email || "",
          service_zips: data.service_zips || [],
          google_review_url: data.google_review_url || "",
          google_place_id: data.google_place_id || "",
          widget_color: data.widget_color || "#059669",
          logo_url: data.logo_url || "",
          widget_price_per_sqft: data.widget_price_per_sqft || null,
          estimate_prices: data.estimate_prices || null,
          sms_notifications: data.sms_notifications || {},
          google_calendar_connected: data.google_calendar_connected || false,
          quickbooks_connected: data.quickbooks_connected || false,
          quickbooks_last_sync: data.quickbooks_last_sync || null,
          notification_preferences: data.notification_preferences || { email: {}, sms: {} },
          booking_enabled: data.booking_enabled || false,
          booking_hours: data.booking_hours || { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
          booking_duration_min: data.booking_duration_min || 60,
          booking_buffer_min: data.booking_buffer_min || 30,
          warranty_enabled: data.warranty_enabled || false,
          warranty_years: data.warranty_years || 1,
          warranty_terms: data.warranty_terms || "",
        })
      }
      setLoading(false)
    }
    load()
  }, [accountId, roleLoading])

  // Load Stripe Connect status
  useEffect(() => {
    if (roleLoading || !accountId || activeTab !== "integrations") return
    const loadStripe = async () => {
      try {
        const res = await authFetch("/api/stripe/connect")
        const data = await res.json()
        setStripeStatus(data)
      } catch {
        setStripeStatus({ connected: false })
      }
    }
    loadStripe()
  }, [accountId, roleLoading, activeTab])

  // QuickBooks sync state
  const [qbSyncing, setQbSyncing] = useState(false)

  // Handle Google Calendar callback
  useEffect(() => {
    const gcal = searchParams.get("gcal")
    if (gcal === "connected") {
      toast.success("Google Calendar connected successfully!")
      if (profile) setProfile({ ...profile, google_calendar_connected: true })
    } else if (gcal === "error") {
      toast.error("Failed to connect Google Calendar. Please try again.")
    }
  }, [searchParams])

  // Handle QuickBooks callback
  useEffect(() => {
    const qb = searchParams.get("qb")
    if (qb === "connected") {
      toast.success("QuickBooks connected successfully!")
      if (profile) setProfile({ ...profile, quickbooks_connected: true })
    } else if (qb === "error") {
      toast.error("Failed to connect QuickBooks. Please try again.")
    }
  }, [searchParams])

  const saveProfile = async (fields: Partial<SettingsProfile>) => {
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", accountId)

    if (error) {
      toast.error("Failed to save: " + error.message)
    } else {
      toast.success("Settings saved!")
    }
    setSaving(false)
  }

  if (loading || roleLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex gap-2 overflow-x-auto border-b border-border pb-3">
          {TABS.map((_, i) => (
            <div key={i} className="h-9 w-24 animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />
          ))}
        </div>
      </div>
    )
  }

  if (!profile) return <p className="p-6">Unable to load settings.</p>

  return (
    <div className="mx-auto max-w-3xl">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-3 mb-6 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Company Information
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Basic details about your roofing business.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <SettingsField
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
              label="Company Name"
              value={profile.company_name}
              onChange={(v) => setProfile({ ...profile, company_name: v })}
              placeholder="e.g. Smith Roofing LLC"
            />
            <SettingsField
              icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
              label="Company Tagline"
              value={profile.company_tagline}
              onChange={(v) => setProfile({ ...profile, company_tagline: v })}
              placeholder="e.g. Quality Roofing You Can Trust — Since 2005"
            />
            <SettingsField
              icon={<Phone className="h-4 w-4 text-muted-foreground" />}
              label="Phone Number"
              value={profile.phone}
              onChange={(v) => setProfile({ ...profile, phone: v })}
              placeholder="(555) 123-4567"
            />
            <SettingsField
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
              label="Business Email"
              value={profile.email}
              onChange={(v) => setProfile({ ...profile, email: v })}
              placeholder="contact@yourcompany.com"
            />
            <SettingsField
              icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
              label="Service Area Zip Codes"
              value={profile.service_zips.join(", ")}
              onChange={(v) => setProfile({ ...profile, service_zips: v.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="62704, 62521, 61820"
            />
            <SettingsField
              icon={<Star className="h-4 w-4 text-muted-foreground" />}
              label="Google Review URL"
              value={profile.google_review_url}
              onChange={(v) => setProfile({ ...profile, google_review_url: v })}
              placeholder="https://g.page/r/your-business/review"
            />
            <SettingsField
              icon={<Star className="h-4 w-4 text-muted-foreground" />}
              label="Google Place ID"
              value={profile.google_place_id}
              onChange={(v) => setProfile({ ...profile, google_place_id: v })}
              placeholder="ChIJ..."
              hint="Find at: Google Maps → Your Business → Share → Place ID"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => saveProfile({
                company_name: profile.company_name,
                company_tagline: profile.company_tagline,
                phone: profile.phone,
                email: profile.email,
                service_zips: profile.service_zips,
                google_review_url: profile.google_review_url,
                google_place_id: profile.google_place_id,
              })}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Branding
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Customize how your business appears on estimates, invoices, contracts, and the customer portal.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
            {/* Brand Color */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={profile.widget_color}
                  onChange={(e) => setProfile({ ...profile, widget_color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                />
                <input
                  value={profile.widget_color}
                  onChange={(e) => setProfile({ ...profile, widget_color: e.target.value })}
                  placeholder="#059669"
                  className="w-28 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Used on customer-facing pages (estimates, invoices, contracts, portal) and emails.
              </p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Company Logo</label>
              {profile.logo_url ? (
                <div className="flex items-center gap-3">
                  <img src={profile.logo_url} alt="Logo" className="h-12 w-auto rounded border border-border object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                  <button
                    onClick={() => setProfile({ ...profile, logo_url: "" })}
                    className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">{uploading ? "Uploading..." : "Click to upload logo"}</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, or SVG</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploading(true)
                      const ext = file.name.split(".").pop()
                      const path = `logos/${accountId}-${Date.now()}.${ext}`
                      const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
                      if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return }
                      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path)
                      setProfile({ ...profile, logo_url: urlData.publicUrl })
                      setUploading(false)
                    }}
                  />
                </label>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Appears on estimates, contracts, invoices, and emails sent to customers.
              </p>
            </div>

            {/* Material Pricing */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Material Pricing ($/square)</label>
              <div className="space-y-2">
                {[
                  { key: "3_tab", label: "3-Tab Shingles", default: 350 },
                  { key: "architectural", label: "Architectural Shingles", default: 450 },
                  { key: "premium", label: "Premium Shingles", default: 600 },
                  { key: "metal", label: "Metal Roofing", default: 900 },
                  { key: "flat_tpo", label: "Flat/TPO", default: 500 },
                ].map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{m.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        step="25"
                        value={profile.estimate_prices?.[m.key]?.toString() ?? m.default.toString()}
                        onChange={(e) => {
                          const prices = { ...(profile.estimate_prices || {}), [m.key]: e.target.value ? Number(e.target.value) : m.default }
                          setProfile({ ...profile, estimate_prices: prices })
                        }}
                        placeholder={m.default.toString()}
                        className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground text-right outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Used for quick estimates. Prices are per roofing square (100 sq ft).
              </p>
            </div>

            {/* Brand Preview */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Preview</label>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: profile.widget_color }}>
                  {profile.logo_url && (
                    <img src={profile.logo_url} alt="" className="h-6 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                  )}
                  <span className="text-sm font-semibold text-white">
                    {profile.company_name || "Your Company"}
                  </span>
                </div>
                <div className="bg-background px-4 py-3">
                  <p className="text-xs text-muted-foreground">Your Estimate</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 w-20 rounded-full" style={{ backgroundColor: profile.widget_color, opacity: 0.3 }} />
                    <div className="h-2 w-12 rounded-full bg-border" />
                  </div>
                  <button
                    className="mt-3 rounded-lg px-4 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: profile.widget_color }}
                    disabled
                  >
                    Accept Estimate
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => saveProfile({
                widget_color: profile.widget_color,
                logo_url: profile.logo_url,
                widget_price_per_sqft: profile.widget_price_per_sqft,
                estimate_prices: profile.estimate_prices,
              })}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Scheduling Tab */}
      {activeTab === "scheduling" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Online Booking
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Let customers schedule appointments directly from your portal or widget.
            </p>
          </div>

          {/* Enable toggle */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Enable Online Booking</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Customers can self-schedule site visits and inspections
                </p>
              </div>
              <NotifToggle
                on={profile.booking_enabled}
                onToggle={() => setProfile({ ...profile, booking_enabled: !profile.booking_enabled })}
              />
            </div>
          </div>

          {profile.booking_enabled && (
            <>
              {/* Business Hours */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Available Hours</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Start Time</label>
                    <input
                      type="time"
                      value={profile.booking_hours.start}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          booking_hours: { ...profile.booking_hours, start: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">End Time</label>
                    <input
                      type="time"
                      value={profile.booking_hours.end}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          booking_hours: { ...profile.booking_hours, end: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Days of week */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Available Days</label>
                  <div className="flex flex-wrap gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                      const active = profile.booking_hours.days.includes(idx)
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            const days = active
                              ? profile.booking_hours.days.filter((d) => d !== idx)
                              : [...profile.booking_hours.days, idx].sort()
                            setProfile({
                              ...profile,
                              booking_hours: { ...profile.booking_hours, days },
                            })
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Duration & Buffer */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Appointment Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (minutes)</label>
                    <select
                      value={profile.booking_duration_min}
                      onChange={(e) => setProfile({ ...profile, booking_duration_min: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Buffer Between</label>
                    <select
                      value={profile.booking_buffer_min}
                      onChange={(e) => setProfile({ ...profile, booking_buffer_min: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={0}>No buffer</option>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => saveProfile({
                booking_enabled: profile.booking_enabled,
                booking_hours: profile.booking_hours,
                booking_duration_min: profile.booking_duration_min,
                booking_buffer_min: profile.booking_buffer_min,
              })}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Integrations
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Connect third-party services to extend your XRoof experience.
            </p>
          </div>

          {/* Google Calendar */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Google Calendar</h4>
                  <p className="text-[10px] text-muted-foreground">Sync scheduled jobs and appointments</p>
                </div>
              </div>
              {profile.google_calendar_connected && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle className="h-3 w-3" /> Connected
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!profile.google_calendar_connected ? (
                <a
                  href="/api/google-calendar/auth"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Connect Google Calendar
                </a>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      const res = await authFetch("/api/google-calendar/sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contractor_id: accountId }),
                      })
                      const data = await res.json()
                      if (data.error) toast.error(data.error)
                      else toast.success(data.message || "Calendar synced!")
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    Sync Now
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Disconnect Google Calendar? Your events will no longer sync.")) return
                      await supabase.from("profiles").update({
                        google_calendar_connected: false,
                        google_refresh_token: null,
                      }).eq("id", accountId)
                      setProfile({ ...profile, google_calendar_connected: false })
                      toast.success("Google Calendar disconnected")
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stripe Connect */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Stripe Connect</h4>
                  <p className="text-[10px] text-muted-foreground">Accept payments from customers</p>
                </div>
              </div>
              {stripeStatus?.connected && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle className="h-3 w-3" /> Connected
                </span>
              )}
            </div>
            {stripeStatus?.connected ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${stripeStatus.charges_enabled ? "bg-emerald-500/15 text-emerald-600" : "bg-yellow-500/15 text-yellow-600"}`}>
                    Charges {stripeStatus.charges_enabled ? "Enabled" : "Pending"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${stripeStatus.payouts_enabled ? "bg-emerald-500/15 text-emerald-600" : "bg-yellow-500/15 text-yellow-600"}`}>
                    Payouts {stripeStatus.payouts_enabled ? "Enabled" : "Pending"}
                  </span>
                </div>
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Open Stripe Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setStripeLoading(true)
                  try {
                    const res = await authFetch("/api/stripe/connect", { method: "POST" })
                    const data = await res.json()
                    if (data.url) window.location.href = data.url
                    else toast.error(data.error || "Failed to start Stripe onboarding")
                  } catch {
                    toast.error("Failed to connect Stripe")
                  }
                  setStripeLoading(false)
                }}
                disabled={stripeLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                {stripeLoading ? "Connecting..." : "Connect Stripe"}
              </button>
            )}
          </div>

          {/* QuickBooks */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">QuickBooks Online</h4>
                  <p className="text-[10px] text-muted-foreground">Auto-sync invoices and payments to your books</p>
                </div>
              </div>
              {profile.quickbooks_connected && (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle className="h-3 w-3" /> Connected
                </span>
              )}
            </div>
            {profile.quickbooks_connected ? (
              <div className="space-y-3">
                {profile.quickbooks_last_sync && (
                  <p className="text-[10px] text-muted-foreground">
                    Last synced: {new Date(profile.quickbooks_last_sync).toLocaleString()}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      setQbSyncing(true)
                      try {
                        const res = await authFetch("/api/quickbooks/sync", { method: "POST" })
                        const data = await res.json()
                        if (data.error) {
                          toast.error(data.error)
                        } else {
                          toast.success(`Synced ${data.synced} invoice${data.synced !== 1 ? "s" : ""} to QuickBooks`)
                          if (data.errors?.length) {
                            data.errors.forEach((e: string) => toast.error(e))
                          }
                          setProfile({ ...profile, quickbooks_last_sync: new Date().toISOString() })
                        }
                      } catch {
                        toast.error("Failed to sync with QuickBooks")
                      }
                      setQbSyncing(false)
                    }}
                    disabled={qbSyncing}
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {qbSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Disconnect QuickBooks? Your invoices will no longer auto-sync.")) return
                      const res = await authFetch("/api/quickbooks/auth", { method: "DELETE" })
                      const data = await res.json()
                      if (data.success) {
                        setProfile({ ...profile, quickbooks_connected: false, quickbooks_last_sync: null })
                        toast.success("QuickBooks disconnected")
                      } else {
                        toast.error("Failed to disconnect")
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <a
                href="/api/quickbooks/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Connect QuickBooks
              </a>
            )}
          </div>

          {/* SMS / Twilio */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <MessageSquare className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">SMS Notifications</h4>
                <p className="text-[10px] text-muted-foreground">Powered by Twilio — configure per-event SMS in the Notifications tab</p>
              </div>
            </div>
            <button
              onClick={() => switchTab("notifications")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <Bell className="h-4 w-4" />
              Manage Notification Preferences
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Notification Preferences
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose how you want to be notified about important events.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_60px_60px] items-center gap-2 border-b border-border bg-secondary/30 px-5 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Event</span>
              <span className="text-center text-xs font-semibold text-muted-foreground">Email</span>
              <span className="text-center text-xs font-semibold text-muted-foreground">SMS</span>
            </div>

            {/* Rows */}
            {NOTIFICATION_EVENTS.map((event, idx) => {
              const emailOn = profile.notification_preferences?.email?.[event.key] ?? true
              const smsOn = profile.notification_preferences?.sms?.[event.key] ?? profile.sms_notifications?.[event.key] ?? true

              return (
                <div
                  key={event.key}
                  className={`grid grid-cols-[1fr_60px_60px] items-center gap-2 px-5 py-3 ${
                    idx < NOTIFICATION_EVENTS.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-[10px] text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex justify-center">
                    <NotifToggle
                      on={emailOn}
                      onToggle={async () => {
                        const updated = {
                          ...profile.notification_preferences,
                          email: { ...profile.notification_preferences?.email, [event.key]: !emailOn },
                        }
                        setProfile({ ...profile, notification_preferences: updated })
                        await supabase.from("profiles").update({ notification_preferences: updated }).eq("id", accountId)
                      }}
                    />
                  </div>
                  <div className="flex justify-center">
                    <NotifToggle
                      on={smsOn}
                      onToggle={async () => {
                        const updatedPrefs = {
                          ...profile.notification_preferences,
                          sms: { ...profile.notification_preferences?.sms, [event.key]: !smsOn },
                        }
                        const updatedSms = { ...profile.sms_notifications, [event.key]: !smsOn }
                        setProfile({ ...profile, notification_preferences: updatedPrefs, sms_notifications: updatedSms })
                        await supabase.from("profiles").update({
                          notification_preferences: updatedPrefs,
                          sms_notifications: updatedSms,
                        }).eq("id", accountId)
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            SMS notifications require Twilio configuration. Changes are saved automatically.
          </p>
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === "email-templates" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Email Templates
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Manage reusable email templates for estimates, invoices, and follow-ups.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-center">
            <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground mb-1">Email Template Manager</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create and edit email templates with dynamic placeholders for customer names, links, and more.
            </p>
            <button
              onClick={() => router.push("/contractor/settings/email-templates")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              Manage Templates
            </button>
          </div>
        </div>
      )}

      {activeTab === "reminders" && (
        <RemindersTab />
      )}

      {/* Warranty Tab */}
      {activeTab === "warranty" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
              Warranty Card
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Enable warranty cards on your customer portal for completed jobs.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Warranty Cards</p>
                <p className="text-xs text-muted-foreground">Show a warranty tab on the customer portal for completed jobs</p>
              </div>
              <NotifToggle
                on={profile.warranty_enabled}
                onToggle={() => setProfile({ ...profile, warranty_enabled: !profile.warranty_enabled })}
              />
            </div>

            {profile.warranty_enabled && (
              <>
                {/* Warranty duration */}
                <div className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
                  <div className="mt-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Workmanship Warranty Period</label>
                    <select
                      value={profile.warranty_years}
                      onChange={(e) => setProfile({ ...profile, warranty_years: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value={1}>1 Year</option>
                      <option value={2}>2 Years</option>
                      <option value={5}>5 Years</option>
                      <option value={10}>10 Years</option>
                      <option value={25}>25 Years</option>
                      <option value={0}>Lifetime</option>
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">How long your workmanship warranty covers the job</p>
                  </div>
                </div>

                {/* Warranty terms */}
                <div className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
                  <div className="mt-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">Warranty Terms & Conditions</label>
                    <textarea
                      value={profile.warranty_terms}
                      onChange={(e) => setProfile({ ...profile, warranty_terms: e.target.value })}
                      placeholder="e.g. This warranty covers defects in workmanship for the specified period from the date of completion. Normal wear and tear, acts of nature, and unauthorized modifications are not covered..."
                      rows={5}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => saveProfile({
              warranty_enabled: profile.warranty_enabled,
              warranty_years: profile.warranty_years,
              warranty_terms: profile.warranty_terms,
            })}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
            Save Warranty Settings
          </button>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <TemplatesTab accountId={accountId} />
      )}

      {/* Referral Tab */}
      {activeTab === "referral" && (
        <ReferralTab />
      )}

      {activeTab === "appearance" && (
        <AppearanceTab />
      )}

      {activeTab === "data" && (
        <DataExportTab />
      )}
    </div>
  )
}

type ReminderTemplate = {
  step: number
  subject: string
  body_html: string
  include_late_fee_warning: boolean
}

const DEFAULT_REMINDERS: ReminderTemplate[] = [
  { step: 1, subject: "Friendly Reminder: Invoice Due", body_html: "Hi {customer_name},\n\nJust a friendly reminder that your invoice #{invoice_number} for ${amount} is due. Please let us know if you have any questions.\n\nThank you for your business!", include_late_fee_warning: false },
  { step: 2, subject: "Overdue Notice: Payment Past Due", body_html: "Hi {customer_name},\n\nThis is a reminder that your invoice #{invoice_number} for ${amount} is now 7 days past due. Please arrange payment at your earliest convenience.\n\nIf you've already sent payment, please disregard this notice.", include_late_fee_warning: false },
  { step: 3, subject: "Final Notice: Payment Required", body_html: "Hi {customer_name},\n\nYour invoice #{invoice_number} for ${amount} is now 14 days overdue. This is our final notice before additional action is taken.\n\nPlease contact us immediately to arrange payment.", include_late_fee_warning: true },
  { step: 4, subject: "Collections Notice: Immediate Payment Required", body_html: "Hi {customer_name},\n\nYour invoice #{invoice_number} for ${amount} is now 30 days past due. If payment is not received within 48 hours, this account may be referred to collections.\n\nPlease contact us immediately.", include_late_fee_warning: true },
]

const STEP_LABELS: Record<number, { label: string; color: string; day: string }> = {
  1: { label: "Friendly Reminder", color: "text-blue-500", day: "Day 1" },
  2: { label: "Overdue Notice", color: "text-amber-500", day: "Day 7" },
  3: { label: "Final Notice", color: "text-orange-500", day: "Day 14" },
  4: { label: "Collections", color: "text-red-500", day: "Day 30" },
}

function RemindersTab() {
  const toast = useToast()
  const [templates, setTemplates] = useState<ReminderTemplate[]>(DEFAULT_REMINDERS)
  const [loadingReminders, setLoadingReminders] = useState(true)
  const [savingStep, setSavingStep] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoadingReminders(true)
      try {
        const res = await authFetch("/api/contractor/reminder-templates")
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const merged = DEFAULT_REMINDERS.map((def) => {
            const saved = data.find((d: ReminderTemplate) => d.step === def.step)
            return saved ? { ...def, ...saved } : def
          })
          setTemplates(merged)
        }
      } catch {
        // Use defaults
      }
      setLoadingReminders(false)
    }
    load()
  }, [])

  const handleSave = async (step: number) => {
    const tpl = templates.find((t) => t.step === step)
    if (!tpl) return
    setSavingStep(step)
    try {
      const res = await authFetch("/api/contractor/reminder-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: tpl.step,
          subject: tpl.subject,
          body_html: tpl.body_html,
          include_late_fee_warning: tpl.include_late_fee_warning,
        }),
      })
      if (res.ok) {
        toast.success(`Step ${step} template saved`)
      } else {
        toast.error("Failed to save template")
      }
    } catch {
      toast.error("Failed to save template")
    }
    setSavingStep(null)
  }

  const updateTemplate = (step: number, fields: Partial<ReminderTemplate>) => {
    setTemplates((prev) => prev.map((t) => t.step === step ? { ...t, ...fields } : t))
  }

  if (loadingReminders) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-secondary/50" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          Payment Reminder Templates
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Customize the automated email reminders sent to customers with overdue invoices. Use {"{customer_name}"}, {"{invoice_number}"}, and {"${amount}"} as placeholders.
        </p>
      </div>

      {templates.map((tpl) => {
        const meta = STEP_LABELS[tpl.step]
        return (
          <div key={tpl.step} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${meta.color}`}>Step {tpl.step}: {meta.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{meta.day}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
              <input
                value={tpl.subject}
                onChange={(e) => updateTemplate(tpl.step, { subject: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Body</label>
              <textarea
                value={tpl.body_html}
                onChange={(e) => updateTemplate(tpl.step, { body_html: e.target.value })}
                rows={5}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
            </div>

            {(tpl.step === 3 || tpl.step === 4) && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tpl.include_late_fee_warning}
                  onChange={(e) => updateTemplate(tpl.step, { include_late_fee_warning: e.target.checked })}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-foreground">Include late fee warning</span>
              </label>
            )}

            <button
              onClick={() => handleSave(tpl.step)}
              disabled={savingStep === tpl.step}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingStep === tpl.step ? "Saving..." : "Save Template"}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function AppearanceTab() {
  // Dynamic import to avoid SSR issues with next-themes
  const [mounted, setMounted] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<string>("dark")

  useEffect(() => {
    setMounted(true)
    // Read theme from document class
    const isLight = document.documentElement.classList.contains("light")
    setCurrentTheme(isLight ? "light" : "dark")
  }, [])

  const applyTheme = (mode: "dark" | "light") => {
    setCurrentTheme(mode)
    if (mode === "light") {
      document.documentElement.classList.add("light")
    } else {
      document.documentElement.classList.remove("light")
    }
    // Persist via next-themes localStorage
    localStorage.setItem("theme", mode)
  }

  if (!mounted) return null

  const themes = [
    {
      id: "dark" as const,
      label: "Dark",
      description: "Easy on the eyes. Great for low-light environments.",
      icon: Moon,
      bg: "#09090b",
      sidebar: "#0f0f12",
      card: "#18181b",
      text: "#e4e4e7",
      muted: "#27272a",
    },
    {
      id: "light" as const,
      label: "Light",
      description: "Clean and bright. Better for well-lit workspaces.",
      icon: Sun,
      bg: "#ffffff",
      sidebar: "#f8fafc",
      card: "#f4f4f5",
      text: "#09090b",
      muted: "#e4e4e7",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          Appearance
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose how XRoof looks for you. This only affects your device.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themes.map((t) => {
          const selected = currentTheme === t.id
          const cyan = "#0891b2"
          return (
            <button
              key={t.id}
              onClick={() => applyTheme(t.id)}
              className={`group relative rounded-2xl border-2 p-4 text-left transition-all ${
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {/* Mini mockup */}
              <div className="mb-3 overflow-hidden rounded-xl border" style={{ borderColor: t.muted, background: t.bg }}>
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: `1px solid ${t.muted}` }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: cyan }} />
                  <div className="h-1.5 w-12 rounded" style={{ background: t.muted }} />
                  <div className="ml-auto h-1.5 w-6 rounded" style={{ background: t.muted }} />
                </div>
                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-10 space-y-1.5 p-2" style={{ background: t.sidebar, borderRight: `1px solid ${t.muted}` }}>
                    <div className="h-1.5 w-full rounded" style={{ background: cyan }} />
                    <div className="h-1.5 w-full rounded" style={{ background: t.muted }} />
                    <div className="h-1.5 w-full rounded" style={{ background: t.muted }} />
                    <div className="h-1.5 w-full rounded" style={{ background: t.muted }} />
                    <div className="h-1.5 w-full rounded" style={{ background: t.muted }} />
                  </div>
                  {/* Content */}
                  <div className="flex-1 space-y-1.5 p-2">
                    <div className="flex gap-1.5">
                      <div className="h-6 flex-1 rounded-md" style={{ background: t.card }} />
                      <div className="h-6 flex-1 rounded-md" style={{ background: t.card }} />
                      <div className="h-6 flex-1 rounded-md" style={{ background: t.card }} />
                    </div>
                    <div className="h-10 w-full rounded-md" style={{ background: t.card }} />
                    <div className="flex gap-1.5">
                      <div className="h-3 flex-1 rounded" style={{ background: cyan, opacity: 0.5 }} />
                      <div className="h-3 flex-1 rounded" style={{ background: t.muted }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <t.icon className="h-4 w-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">{t.label}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              {selected && (
                <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DataExportTab() {
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast.error("Not authenticated"); setExporting(false); return }

      const res = await fetch("/api/export", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }))
        toast.error(err.error || "Export failed")
        setExporting(false)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `xroof-export-${new Date().toISOString().split("T")[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Export downloaded!")
    } catch {
      toast.error("Export failed")
    }
    setExporting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
          Data Export
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Download all your data as a ZIP file containing CSV spreadsheets.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-foreground mb-3">Export All Data</h4>
        <p className="text-xs text-muted-foreground mb-4">
          This will download a ZIP file containing:
        </p>
        <ul className="text-xs text-muted-foreground mb-6 space-y-1 ml-4 list-disc">
          <li><strong>jobs.csv</strong> — All leads and jobs with status, dates, amounts</li>
          <li><strong>customers.csv</strong> — Customer names, contact info, notes</li>
          <li><strong>invoices.csv</strong> — All invoices with amounts and payment status</li>
          <li><strong>sms_messages.csv</strong> — SMS conversation history</li>
          <li><strong>work_orders.csv</strong> — Work orders with assignments and status</li>
          <li><strong>appointments.csv</strong> — All scheduled appointments</li>
        </ul>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Download All Data (ZIP)"}
        </button>
      </div>
    </div>
  )
}

function ReferralTab() {
  const toast = useToast()
  const [code, setCode] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalReferred: 0, totalConverted: 0, totalEarned: 0 })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    authFetch("/api/referrals")
      .then((r) => r.json())
      .then((data) => {
        setCode(data.code || null)
        if (data.stats) setStats(data.stats)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const generateCode = async () => {
    setGenerating(true)
    const res = await authFetch("/api/referrals", { method: "POST" })
    const data = await res.json()
    if (data.code) {
      setCode(data.code)
      toast.success("Referral code generated!")
    }
    setGenerating(false)
  }

  const referralUrl = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth?ref=${code}` : ""

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />)}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Referral Program</h3>
        <p className="text-xs text-muted-foreground">Refer other contractors to XRoof and earn $50 credit for each signup that subscribes.</p>
      </div>

      {!code ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-primary/40" />
          <p className="text-sm font-medium text-foreground mb-1">Get Your Referral Link</p>
          <p className="text-xs text-muted-foreground mb-4">Generate a unique link to share with other contractors. When they subscribe, you both get $50 credit.</p>
          <button onClick={generateCode} disabled={generating} className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {generating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Gift className="h-4 w-4" />}
            Generate Referral Link
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground mb-2">Your Referral Link</p>
            <div className="flex gap-2">
              <input value={referralUrl} readOnly className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground" />
              <button onClick={copyLink} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Code: <span className="font-mono font-medium text-foreground">{code}</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-foreground">{stats.totalReferred}</p>
              <p className="text-xs text-muted-foreground">Referred</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-emerald-500">{stats.totalConverted}</p>
              <p className="text-xs text-muted-foreground">Subscribed</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-primary">${stats.totalEarned}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/30 p-4">
            <p className="text-xs font-medium text-foreground mb-1">How it works</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Share your referral link with other contractors</li>
              <li>They sign up and start their free trial</li>
              <li>When they subscribe, you both get $50 credit applied to your next invoice</li>
            </ol>
          </div>
        </>
      )}
    </div>
  )
}

const JOB_TYPES = ["Roof Replacement", "Roof Repair", "Inspection", "Storm Damage", "Insurance Claim", "Other"]

function TemplatesTab({ accountId }: { accountId: string }) {
  const toast = useToast()
  const [templates, setTemplates] = useState<{ id: string; name: string; job_type: string; description: string; default_budget: number | null; material_notes: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", job_type: "", description: "", default_budget: "", material_notes: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authFetch("/api/job-templates")
      .then((r) => r.json())
      .then((data) => { setTemplates(data.templates || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setForm({ name: "", job_type: "", description: "", default_budget: "", material_notes: "" })
    setEditId(null)
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      ...(editId ? { id: editId } : {}),
      name: form.name,
      job_type: form.job_type || null,
      description: form.description || null,
      default_budget: form.default_budget ? Number(form.default_budget) : null,
      material_notes: form.material_notes || null,
    }

    const res = await authFetch("/api/job-templates", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      toast.success(editId ? "Template updated" : "Template created")
      // Reload
      const r = await authFetch("/api/job-templates")
      const data = await r.json()
      setTemplates(data.templates || [])
      resetForm()
    } else {
      toast.error("Failed to save template")
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const res = await authFetch(`/api/job-templates?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Template deleted")
    }
  }

  const startEdit = (t: typeof templates[0]) => {
    setEditId(t.id)
    setForm({
      name: t.name,
      job_type: t.job_type || "",
      description: t.description || "",
      default_budget: t.default_budget ? String(t.default_budget) : "",
      material_notes: t.material_notes || "",
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>Job Templates</h3>
          <p className="text-xs text-muted-foreground">Pre-saved job configurations for quick job creation in the pipeline.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-foreground">{editId ? "Edit Template" : "Create Template"}</h4>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Template name *" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Job type</option>
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={form.default_budget} onChange={(e) => setForm({ ...form, default_budget: e.target.value })} placeholder="Default budget ($)" className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Default job description" rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <textarea value={form.material_notes} onChange={(e) => setForm({ ...form, material_notes: e.target.value })} placeholder="Material notes (optional)" rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !form.name.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save className="h-4 w-4" />}
              {editId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/50" />)}</div>
      ) : templates.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No templates yet. Create one to speed up job creation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[t.job_type, t.default_budget ? `$${Number(t.default_budget).toLocaleString()}` : null, t.description].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button onClick={() => startEdit(t)} className="rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary/10">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
      <div className="mt-2">{icon}</div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function NotifToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  )
}
