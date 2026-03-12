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
  Bell, Save, CheckCircle, ExternalLink, Settings,
} from "lucide-react"

type SettingsProfile = {
  company_name: string
  phone: string
  email: string
  service_zips: string[]
  google_review_url: string
  widget_color: string
  logo_url: string
  widget_price_per_sqft: number | null
  sms_notifications: Record<string, boolean>
  google_calendar_connected: boolean
  quickbooks_connected: boolean
  quickbooks_last_sync: string | null
  notification_preferences: NotificationPreferences
}

type NotificationPreferences = {
  email: Record<string, boolean>
  sms: Record<string, boolean>
}

const TABS = [
  { id: "general", label: "General", icon: Building2 },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "email-templates", label: "Templates", icon: Mail },
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
        .select("company_name, phone, email, service_zips, google_review_url, widget_color, logo_url, widget_price_per_sqft, sms_notifications, google_calendar_connected, quickbooks_connected, quickbooks_last_sync, notification_preferences")
        .eq("id", accountId)
        .single()

      if (error || !data) {
        setProfile({
          company_name: "", phone: "", email: "", service_zips: [],
          google_review_url: "", widget_color: "#059669", logo_url: "",
          widget_price_per_sqft: null, sms_notifications: {},
          google_calendar_connected: false, quickbooks_connected: false, quickbooks_last_sync: null,
          notification_preferences: { email: {}, sms: {} },
        })
      } else {
        setProfile({
          company_name: data.company_name || "",
          phone: data.phone || "",
          email: data.email || "",
          service_zips: data.service_zips || [],
          google_review_url: data.google_review_url || "",
          widget_color: data.widget_color || "#059669",
          logo_url: data.logo_url || "",
          widget_price_per_sqft: data.widget_price_per_sqft || null,
          sms_notifications: data.sms_notifications || {},
          google_calendar_connected: data.google_calendar_connected || false,
          quickbooks_connected: data.quickbooks_connected || false,
          quickbooks_last_sync: data.quickbooks_last_sync || null,
          notification_preferences: data.notification_preferences || { email: {}, sms: {} },
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
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => saveProfile({
                company_name: profile.company_name,
                phone: profile.phone,
                email: profile.email,
                service_zips: profile.service_zips,
                google_review_url: profile.google_review_url,
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
                    className="text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
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

            {/* Price per sq ft */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Default Price ($/sq ft)</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.25"
                  value={profile.widget_price_per_sqft?.toString() || ""}
                  onChange={(e) => setProfile({ ...profile, widget_price_per_sqft: e.target.value ? Number(e.target.value) : null })}
                  placeholder="4.50"
                  className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Used for instant estimates on your lead capture widget.
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
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
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
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
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
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <CheckCircle className="h-3 w-3" /> Connected
                </span>
              )}
            </div>
            {stripeStatus?.connected ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${stripeStatus.charges_enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                    Charges {stripeStatus.charges_enabled ? "Enabled" : "Pending"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${stripeStatus.payouts_enabled ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"}`}>
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
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
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
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
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
              const emailOn = profile.notification_preferences?.email?.[event.key] ?? false
              const smsOn = profile.notification_preferences?.sms?.[event.key] ?? profile.sms_notifications?.[event.key] ?? false

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
    </div>
  )
}

function SettingsField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
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
