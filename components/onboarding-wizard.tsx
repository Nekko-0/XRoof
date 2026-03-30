"use client"

import { useState } from "react"
import { Building2, MapPin, Palette, ImageIcon, ChevronRight, ChevronLeft, Check, X, Upload } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/lib/toast-context"

type Step = {
  title: string
  description: string
  icon: React.ElementType
}

const STEPS: Step[] = [
  { title: "Company Info", description: "Tell us about your business", icon: Building2 },
  { title: "Service Area", description: "Where do you operate?", icon: MapPin },
  { title: "Branding", description: "Customize your look", icon: Palette },
  { title: "Logo", description: "Add your company logo", icon: ImageIcon },
]

export function OnboardingWizard({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [data, setData] = useState({
    company_name: "",
    phone: "",
    email: "",
    service_zips: "",
    widget_color: "#0891b2",
    widget_price_per_sqft: "",
    logo_url: "",
  })

  const handleLogoUpload = async (file: File) => {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const path = `logos/${userId}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("assets").upload(path, file, { upsert: true })
    if (error) {
      toast.error("Upload failed: " + error.message)
      setUploading(false)
      return
    }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path)
    setData((d) => ({ ...d, logo_url: urlData.publicUrl }))
    setUploading(false)
  }

  const handleFinish = async () => {
    setSaving(true)
    const zips = data.service_zips
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean)

    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: data.company_name || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        service_zips: zips.length > 0 ? zips : undefined,
        widget_color: data.widget_color,
        widget_price_per_sqft: data.widget_price_per_sqft ? parseFloat(data.widget_price_per_sqft) : undefined,
        logo_url: data.logo_url || undefined,
        onboarding_completed: true,
      })
      .eq("id", userId)

    setSaving(false)
    if (error) {
      toast.error("Failed to save: " + error.message)
    } else {
      toast.success("Setup complete! Welcome to XRoof.")
      onComplete()
    }
  }

  const handleSkip = async () => {
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId)
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 mb-1">
            {(() => {
              const Icon = STEPS[step].icon
              return <Icon className="h-5 w-5 text-primary" />
            })()}
            <h2 className="text-lg font-bold text-foreground">{STEPS[step].title}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">{STEPS[step].description}</p>
        </div>

        {/* Step Content */}
        <div className="px-6 pb-6">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Company Name</label>
                <input
                  type="text"
                  value={data.company_name}
                  onChange={(e) => setData({ ...data, company_name: e.target.value })}
                  placeholder="e.g., Leon's Roofing"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone Number</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Business Email</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => setData({ ...data, email: e.target.value })}
                  placeholder="contact@yourcompany.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Service Area Zip Codes</label>
                <input
                  type="text"
                  value={data.service_zips}
                  onChange={(e) => setData({ ...data, service_zips: e.target.value })}
                  placeholder="10001, 10002, 10003"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">Separate multiple zip codes with commas</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={data.widget_color}
                    onChange={(e) => setData({ ...data, widget_color: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border"
                  />
                  <span className="text-xs text-muted-foreground">{data.widget_color}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Used on your lead capture widget and customer-facing pages</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Default Price per Sq Ft</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    step="0.25"
                    value={data.widget_price_per_sqft}
                    onChange={(e) => setData({ ...data, widget_price_per_sqft: e.target.value })}
                    placeholder="4.50"
                    className="w-32 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Used for instant estimates on your widget</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold text-muted-foreground">Company Logo</label>
                {data.logo_url ? (
                  <div className="rounded-lg border border-border bg-background p-4 text-center">
                    <img src={data.logo_url} alt="Logo preview" className="mx-auto h-20 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                    <button
                      onClick={() => setData({ ...data, logo_url: "" })}
                      className="mt-2 text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      Remove & upload different
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-8 transition-colors hover:border-primary/40 hover:bg-primary/5">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{uploading ? "Uploading..." : "Click to upload logo"}</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, or SVG — max 2MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                      }}
                    />
                  </label>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground">Appears on estimates, contracts, and invoices sent to customers</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : "Finish Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
