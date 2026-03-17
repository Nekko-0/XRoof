"use client"

import { useState, useEffect } from "react"
import { useRole } from "@/lib/role-context"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { MaterialCalculator, type MaterialLine } from "@/components/material-calculator"
import { useToast } from "@/lib/toast-context"
import { Calculator, FileText, Eye, EyeOff, Plus, CheckCircle, Package } from "lucide-react"

type CatalogProduct = {
  id: string
  brand: string
  product_line: string
  color_name: string
  price_tier: "economy" | "mid" | "premium" | "luxury"
  description: string | null
}

type BrandPreference = {
  brand: string
  visible: boolean
}

const BRANDS = ["GAF", "Owens Corning", "CertainTeed", "Atlas", "IKO", "Tamko", "Home Depot"] as const

const TIER_COLORS: Record<string, string> = {
  economy: "bg-gray-500 text-white",
  mid: "bg-blue-500 text-white",
  premium: "bg-amber-500 text-white",
  luxury: "bg-purple-500 text-white",
}

export default function MaterialsPage() {
  const { accountId, loading: roleLoading } = useRole()
  const toast = useToast()
  const [jobs, setJobs] = useState<{ id: string; customer_name: string; address: string; budget: number | null }[]>([])
  const [selectedJob, setSelectedJob] = useState("")
  const [jobData, setJobData] = useState<{ roofArea: number; pitch: string }>({ roofArea: 0, pitch: "4/12" })

  // Catalog state
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([])
  const [brandPrefs, setBrandPrefs] = useState<Record<string, boolean>>({})
  const [activeBrand, setActiveBrand] = useState<string>(BRANDS[0])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set())

  // Load catalog + preferences
  useEffect(() => {
    if (roleLoading || !accountId) return
    const loadCatalog = async () => {
      setCatalogLoading(true)

      // Fetch catalog — independent of preferences
      try {
        const catRes = await authFetch(`/api/materials/catalog?contractor_id=${accountId}`)
        if (catRes.ok) {
          const catData = await catRes.json()
          if (catData.brands && Array.isArray(catData.brands)) {
            const flat: CatalogProduct[] = []
            for (const b of catData.brands) {
              for (const p of b.products) {
                flat.push({
                  id: p.id,
                  brand: b.name,
                  product_line: p.product_line,
                  color_name: p.color,
                  price_tier: p.price_tier,
                  description: p.description,
                })
              }
            }
            setCatalogProducts(flat)
          }
        }
      } catch {
        console.error("Failed to load material catalog")
      }

      // Fetch preferences — separate so it can't crash catalog
      try {
        const prefRes = await authFetch(`/api/materials/preferences`)
        if (prefRes.ok) {
          const prefData = await prefRes.json()
          const prefs: Record<string, boolean> = {}
          for (const b of BRANDS) prefs[b] = true
          const hiddenBrands: string[] = prefData?.hidden_brands || []
          for (const hb of hiddenBrands) prefs[hb] = false
          setBrandPrefs(prefs)
        } else {
          const prefs: Record<string, boolean> = {}
          for (const b of BRANDS) prefs[b] = true
          setBrandPrefs(prefs)
        }
      } catch {
        const prefs: Record<string, boolean> = {}
        for (const b of BRANDS) prefs[b] = true
        setBrandPrefs(prefs)
      }

      setCatalogLoading(false)
    }
    loadCatalog()
  }, [accountId, roleLoading])

  const toggleBrandVisibility = async (brand: string) => {
    const newVal = !brandPrefs[brand]
    setBrandPrefs((prev) => ({ ...prev, [brand]: newVal }))
    try {
      // Build hidden_brands array from current state
      const updated = { ...brandPrefs, [brand]: newVal }
      const hidden_brands = BRANDS.filter(b => updated[b] === false)
      await authFetch(`/api/materials/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden_brands }),
      })
    } catch {
      toast.error("Failed to update preference")
      setBrandPrefs((prev) => ({ ...prev, [brand]: !newVal }))
    }
  }

  const handleAddToEstimate = (product: CatalogProduct) => {
    const existing = JSON.parse(sessionStorage.getItem("material_estimate_items") || "[]")
    existing.push({ description: `${product.brand} ${product.product_line} — ${product.color_name}`, quantity: 1, unit_price: 0 })
    sessionStorage.setItem("material_estimate_items", JSON.stringify(existing))
    setAddedProducts((prev) => new Set(prev).add(product.id))
    toast.success(`Added ${product.color_name} to estimate items`)
  }

  // Group products by product_line for the active brand
  const brandProducts = catalogProducts.filter((p) => p.brand === activeBrand)
  const productsByLine: Record<string, CatalogProduct[]> = {}
  for (const p of brandProducts) {
    if (!productsByLine[p.product_line]) productsByLine[p.product_line] = []
    productsByLine[p.product_line].push(p)
  }

  // Load active jobs for picker
  useEffect(() => {
    if (roleLoading || !accountId) return
    const load = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, customer_name, address, budget")
        .eq("contractor_id", accountId)
        .not("status", "in", '("Completed","Lost")')
        .order("created_at", { ascending: false })
        .limit(50)
      setJobs(data || [])
    }
    load()
  }, [accountId, roleLoading])

  // Load report data for selected job
  useEffect(() => {
    if (!selectedJob) {
      setJobData({ roofArea: 0, pitch: "4/12" })
      return
    }
    const load = async () => {
      const { data: report } = await supabase
        .from("reports")
        .select("roof_squares, roof_pitch, measurement_data")
        .eq("job_id", selectedJob)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (report) {
        const area = report.roof_squares ? report.roof_squares * 100 : 0
        setJobData({
          roofArea: report.measurement_data?.total_area || area,
          pitch: report.roof_pitch || "4/12",
        })
      } else {
        // No report linked by job_id — check if job has measurement data
        const { data: job } = await supabase
          .from("jobs")
          .select("measurement_data, address")
          .eq("id", selectedJob)
          .single()
        if (job?.measurement_data?.total_area) {
          setJobData({
            roofArea: job.measurement_data.total_area,
            pitch: job.measurement_data.pitch || "4/12",
          })
        } else if (job?.address) {
          // Build a fuzzy pattern from the house number for address matching
          const houseNum = job.address.match(/^(\d+)/)?.[1] || ""
          const fuzzyPattern = houseNum ? `%${houseNum}%` : `%${job.address.split(" ").slice(0, 2).join("%")}%`

          // Check measurements table FIRST (where the Measure tool saves data)
          const { data: measurement } = await supabase
            .from("measurements")
            .select("adjusted_area, pitch")
            .ilike("address", fuzzyPattern)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (measurement?.adjusted_area) {
            setJobData({
              roofArea: measurement.adjusted_area,
              pitch: measurement.pitch || "4/12",
            })
          } else {
            // Fall back to report address match (only if it has useful data)
            const { data: addrReport } = await supabase
              .from("reports")
              .select("roof_squares, roof_pitch, measurement_data")
              .ilike("customer_address", fuzzyPattern)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
            if (addrReport) {
              const area = addrReport.roof_squares ? addrReport.roof_squares * 100 : 0
              const total = addrReport.measurement_data?.total_area || area
              if (total > 0) {
                setJobData({ roofArea: total, pitch: addrReport.roof_pitch || "4/12" })
              }
            }
          }
        }
      }
    }
    load()
  }, [selectedJob])

  const handleExportToEstimate = (materials: MaterialLine[]) => {
    // Store materials data in sessionStorage for the report builder to pick up
    const estimateItems = materials.map((m) => ({
      description: m.item,
      quantity: m.quantity,
      unit_price: m.unitPrice,
    }))
    sessionStorage.setItem("material_estimate_items", JSON.stringify(estimateItems))
    toast.success("Material costs copied! Open Report Builder to paste into estimate.")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Material Calculator
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Calculate material quantities and costs for any roofing job. Customize prices to match your supplier.
        </p>
      </div>

      {/* Material Catalog */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Package className="h-4 w-4 text-primary" /> Material Catalog
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Browse products by brand. Add items to your estimate or hide brands you don&apos;t carry.
          </p>
        </div>

        {/* Brand Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {BRANDS.map((brand) => (
            <button
              key={brand}
              onClick={() => setActiveBrand(brand)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeBrand === brand
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {brand}
              {brandPrefs[brand] === false && <EyeOff className="h-3 w-3 opacity-50" />}
            </button>
          ))}
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs text-muted-foreground">
            Show <strong>{activeBrand}</strong> products to customers
          </span>
          <button
            onClick={() => toggleBrandVisibility(activeBrand)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              brandPrefs[activeBrand] !== false
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {brandPrefs[activeBrand] !== false ? (
              <><Eye className="h-3.5 w-3.5" /> Visible</>
            ) : (
              <><EyeOff className="h-3.5 w-3.5" /> Hidden</>
            )}
          </button>
        </div>

        {/* Products grouped by product_line */}
        {catalogLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : Object.keys(productsByLine).length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No catalog products found for {activeBrand}. Catalog data will appear once the API is populated.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(productsByLine).map(([line, products]) => (
              <div key={line}>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{line}</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start justify-between rounded-xl border border-border bg-background p-3"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground truncate">{product.color_name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${TIER_COLORS[product.price_tier] || "bg-gray-500 text-white"}`}>
                            {product.price_tier}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddToEstimate(product)}
                        disabled={addedProducts.has(product.id)}
                        className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                          addedProducts.has(product.id)
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                        title="Add to Estimate"
                      >
                        {addedProducts.has(product.id) ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Picker */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          Auto-fill from Job (optional)
        </label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Enter measurements manually</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.customer_name} — {j.address}
            </option>
          ))}
        </select>
        {selectedJob && jobData.roofArea === 0 && (
          <p className="mt-2 text-xs text-amber-600">No measurement data found for this job. Enter roof area manually below, or use the Measure tool first.</p>
        )}
      </div>

      <MaterialCalculator
        roofAreaSqft={jobData.roofArea}
        pitch={jobData.pitch}
        onExport={handleExportToEstimate}
      />

      {/* Quick Reference */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Calculator className="h-4 w-4 text-primary" /> Quick Reference
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs text-muted-foreground">
          <div>
            <p className="mb-1.5 font-semibold text-foreground">Coverage Rates</p>
            <ul className="space-y-1">
              <li>1 square = 100 sqft of roof area</li>
              <li>3 bundles = 1 square of shingles</li>
              <li>1 roll underlayment = ~4 squares</li>
              <li>1 roll starter strip = ~120 linear ft</li>
              <li>1 ridge cap bundle = ~33 linear ft</li>
            </ul>
          </div>
          <div>
            <p className="mb-1.5 font-semibold text-foreground">Waste Factors</p>
            <ul className="space-y-1">
              <li>Simple gable roof: 10-12%</li>
              <li>Hip roof: 15-18%</li>
              <li>Complex cut-up roof: 18-22%</li>
              <li>Mansard/steep pitch: 20-25%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
