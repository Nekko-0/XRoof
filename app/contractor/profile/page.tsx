"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Briefcase, CheckCircle, LogOut, Package, Plus, Trash2, Settings, Smartphone, Download, Share } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/toast-context"
import Link from "next/link"

type Profile = {
  company_name: string
  material_prices: Record<string, number>
}

export default function ContractorProfilePage() {
  const router = useRouter()
  const toast = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [activeJobs, setActiveJobs] = useState(0)
  const [completedJobs, setCompletedJobs] = useState(0)
  const [userName, setUserName] = useState("")
  const [showCustomMaterialForm, setShowCustomMaterialForm] = useState(false)
  const [customMaterialName, setCustomMaterialName] = useState("")
  const [customMaterialPrice, setCustomMaterialPrice] = useState("")
  const [customMaterialUnit, setCustomMaterialUnit] = useState("per piece")
  const [savingMaterials, setSavingMaterials] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      const user = session.user

      setUserId(user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, material_prices")
        .eq("id", user.id)
        .single()

      setUserName(user.user_metadata?.username || user.email?.split("@")[0] || "Contractor")

      // Fetch job counts
      const { count: active } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .in("status", ["Assigned", "Accepted"])
      setActiveJobs(active || 0)

      const { count: completed } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Completed")
      setCompletedJobs(completed || 0)

      if (error || !data) {
        setProfile({ company_name: "", material_prices: {} })
      } else {
        setProfile({
          company_name: data.company_name || "",
          material_prices: data.material_prices || {},
        })
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSaveMaterials = async () => {
    if (!profile) return
    setSavingMaterials(true)
    const { error } = await supabase
      .from("profiles")
      .update({ material_prices: profile.material_prices })
      .eq("id", userId)

    if (error) {
      toast.error("Error saving: " + error.message)
    } else {
      toast.success("Material prices saved!")
    }
    setSavingMaterials(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
            <Skeleton className="h-4 w-4 rounded mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
  if (!profile) return <p className="p-6">Profile not found. Please log in again.</p>

  const initials = userName.slice(0, 2).toUpperCase()

  const profileStats = [
    { label: "Active Leads", value: activeJobs, icon: Briefcase, color: "bg-emerald-900/30 text-emerald-400" },
    { label: "Completed", value: completedJobs, icon: CheckCircle, color: "bg-blue-900/30 text-blue-400" },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      {/* Profile header with avatar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {userName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {profile.company_name ? `${profile.company_name} · Contractor` : "Contractor"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {profileStats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Go to Settings card */}
      <Link
        href="/contractor/settings"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Account Settings</p>
          <p className="text-[10px] text-muted-foreground">Company info, branding, integrations, and notifications</p>
        </div>
        <span className="text-muted-foreground">&rsaquo;</span>
      </Link>

      {/* Install App */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Install XRoof App</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Add XRoof to your home screen for faster access, offline mode, and push notifications.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-xl bg-secondary/40 px-4 py-3">
            <Download className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Android / Chrome</p>
              <p className="text-[10px] text-muted-foreground">
                Tap the browser menu (three dots) and select &quot;Install app&quot; or &quot;Add to Home screen&quot;.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-secondary/40 px-4 py-3">
            <Share className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">iPhone / iPad (Safari)</p>
              <p className="text-[10px] text-muted-foreground">
                Tap the <strong>Share</strong> button, then select <strong>Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Material Pricing */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Material Pricing</h3>
          </div>
          <button
            onClick={handleSaveMaterials}
            disabled={savingMaterials}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {savingMaterials ? "Saving..." : "Save Prices"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Set your default material prices for the material calculator. These will be used when estimating job costs.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { key: "shingle_bundle", label: "Shingles (per bundle)", default: 35 },
            { key: "underlayment_roll", label: "Underlayment (per roll)", default: 45 },
            { key: "drip_edge", label: "Drip Edge (per 10ft piece)", default: 8 },
            { key: "ridge_cap", label: "Ridge Cap (per bundle)", default: 32 },
            { key: "starter_strip", label: "Starter Strip (per roll)", default: 25 },
            { key: "nails_box", label: "Roofing Nails (per box)", default: 30 },
            { key: "ice_water_shield", label: "Ice & Water Shield (per roll)", default: 65 },
          ].map((item) => (
            <div key={item.key}>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">{item.label}</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={item.default.toString()}
                  value={profile.material_prices[item.key] ?? ""}
                  onChange={(e) => setProfile({ ...profile, material_prices: { ...profile.material_prices, [item.key]: e.target.value ? parseFloat(e.target.value) : undefined } } as Profile)}
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          ))}
        </div>
        {/* Custom Materials */}
        {(() => {
          const presetKeys = ["shingle_bundle", "underlayment_roll", "drip_edge", "ridge_cap", "starter_strip", "nails_box", "ice_water_shield"]
          const customEntries = Object.entries(profile.material_prices).filter(
            ([key]) => !presetKeys.includes(key) && profile.material_prices[key] !== undefined
          )
          return (
            <>
              {customEntries.length > 0 && (
                <>
                  <div className="mt-4 mb-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom Materials</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {customEntries.map(([key, price]) => (
                      <div key={key} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-semibold text-muted-foreground truncate pr-1">
                            {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </label>
                          <span className="flex-shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[8px] font-bold text-primary">Custom</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={price ?? ""}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                material_prices: {
                                  ...profile.material_prices,
                                  [key]: e.target.value ? parseFloat(e.target.value) : undefined,
                                },
                              } as Profile)
                            }
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => {
                              const updated = { ...profile.material_prices }
                              delete updated[key]
                              setProfile({ ...profile, material_prices: updated })
                            }}
                            className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Remove custom material"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Add Custom Material */}
              <div className="mt-4">
                {!showCustomMaterialForm ? (
                  <button
                    onClick={() => setShowCustomMaterialForm(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Custom Material
                  </button>
                ) : (
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-2">New Custom Material</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="mb-1 block text-[10px] text-muted-foreground">Name</label>
                        <input
                          type="text"
                          value={customMaterialName}
                          onChange={(e) => setCustomMaterialName(e.target.value)}
                          placeholder="e.g. Copper Flashing"
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                      <div className="w-24">
                        <label className="mb-1 block text-[10px] text-muted-foreground">Price</label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customMaterialPrice}
                            onChange={(e) => setCustomMaterialPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                          />
                        </div>
                      </div>
                      <div className="w-36">
                        <label className="mb-1 block text-[10px] text-muted-foreground">Unit</label>
                        <select
                          value={customMaterialUnit}
                          onChange={(e) => setCustomMaterialUnit(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                        >
                          <option value="per sq ft">per sq ft</option>
                          <option value="per linear ft">per linear ft</option>
                          <option value="per piece">per piece</option>
                          <option value="per square">per square</option>
                        </select>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            if (!customMaterialName.trim()) return
                            const key = customMaterialName.trim().toLowerCase().replace(/\s+/g, "_")
                            setProfile({
                              ...profile,
                              material_prices: {
                                ...profile.material_prices,
                                [key]: customMaterialPrice ? parseFloat(customMaterialPrice) : 0,
                              },
                            })
                            setCustomMaterialName("")
                            setCustomMaterialPrice("")
                            setCustomMaterialUnit("per piece")
                            setShowCustomMaterialForm(false)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowCustomMaterialForm(false)
                            setCustomMaterialName("")
                            setCustomMaterialPrice("")
                            setCustomMaterialUnit("per piece")
                          }}
                          className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        })()}

        <p className="mt-3 text-[10px] text-muted-foreground">
          Prices are stored in your profile and used by the material calculator in the measurement tool.
        </p>
      </div>
    </div>
  )
}
