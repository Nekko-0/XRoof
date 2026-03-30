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
  image_url: string | null
}

type BrandPreference = {
  brand: string
  visible: boolean
}

const BRANDS = ["GAF", "Owens Corning", "CertainTeed", "Atlas", "IKO", "Tamko", "Malarkey", "PABCO", "DaVinci", "Decra", "Boral", "Eagle", "Home Depot", "Lowe's"] as const

const TIER_COLORS: Record<string, string> = {
  economy: "bg-gray-500 text-white",
  mid: "bg-blue-500 text-white",
  premium: "bg-amber-500 text-white",
  luxury: "bg-purple-500 text-white",
}

// Color-accurate swatch hex codes for roofing shingle colors
const SWATCH_COLORS: Record<string, string> = {
  // ── Black tones ──
  "charcoal": "#3a3a3a", "onyx black": "#1a1a1a", "moire black": "#222222",
  "dual black": "#1e1e1e", "rustic black": "#252525", "shadow black": "#2a2a2a",
  "pristine black": "#1c1c1c", "midnight black": "#181818", "black": "#1a1a1a",
  "carbon": "#2a2c2e", "ebony": "#1e1e20", "noir": "#202020",
  "max def moire black": "#222222", "true black": "#161616",

  // ── Gray tones ──
  "pewter gray": "#7a7d7e", "slate": "#5a6370", "estate gray": "#6b6e70",
  "georgetown gray": "#5e6264", "pewter": "#8a8d8f", "cobblestone gray": "#6d7072",
  "fox hollow gray": "#5f6366", "oyster gray": "#9a9c98", "quarry gray": "#6e7173",
  "sierra gray": "#7e8185", "castle gray": "#686c6e", "hearthstone gray": "#6a6e72",
  "thunderstorm gray": "#5c5f63", "mountain slate": "#5b6068", "dual gray": "#707478",
  "charcoal gray": "#404448", "pewterwood": "#6b6560", "granite gray": "#686c70",
  "shadow gray": "#505458", "coastal gray": "#6e7478", "storm grey": "#5a5e62",
  "silverwood": "#8a8e90", "thunderstorm grey": "#4e5258", "slate gray": "#5a6068",
  "colonial slate": "#5a5e64", "nickel gray": "#7e8084", "harbor mist": "#8a8e92",
  "williamsburg gray": "#5e6468", "silver birch": "#9a9e98", "silver lining": "#959a9e",
  "platinum gray": "#8a8c90", "ash gray": "#6e7276", "dove gray": "#8e9094",
  "nordic grey": "#5a6064", "max def pewter gray": "#7a7d7e",
  "weathered gray": "#6a6e72", "zinc gray": "#7a7e82",
  "charcoal blend": "#3e4042",

  // ── Brown / Wood tones ──
  "weathered wood": "#6e5d4e", "hickory": "#7a6148", "barkwood": "#6a5545",
  "shakewood": "#7d6b55", "mission brown": "#5e4a3a", "driftwood": "#8a7e6e",
  "brownwood": "#5e4e3e", "teak": "#6e5840", "resawn shake": "#756050",
  "burnt sienna": "#8b5a3a", "brownstone": "#6b5848", "natural timber": "#8a7558",
  "aged wood": "#7e6e5e", "rustic cedar": "#8a6240", "earthtone cedar": "#7a6045",
  "weatherwood": "#6e5e50", "sedona canyon": "#8b6850", "sedona": "#9a6848",
  "antique brown": "#6a5040", "natural wood": "#7a6850", "autumn": "#7a5838",
  "autumn blend": "#7a5a40", "black walnut": "#3a2e28", "brownstone blend": "#6a5a48",
  "max def weathered wood": "#6e5d4e", "max def driftwood": "#8a7e6e",
  "aged bark": "#5e4a3e", "cedar brown": "#7e5a3e", "timber blend": "#6e5840",
  "chestnut": "#5e4030", "walnut": "#5a4230", "saddlewood": "#7a6248",
  "amber": "#8a6a40", "pecan": "#7a5e40", "autumn brown": "#6e5038",
  "heatherwood": "#6e5e50", "woodland": "#5e5040", "bark": "#5e4e40",
  "bark (metal)": "#5e4e40", "tahoe": "#4e4640", "cocoa": "#5a4838",
  "cafe": "#7a6a58", "mocha": "#5e4a3c", "villa blend": "#8a7058",
  "shadowood": "#5a4e42", "european": "#5e5650", "castle": "#686058",

  // ── Tan / Beige / Sand tones ──
  "sand dune": "#b8a888", "desert tan": "#baa878", "desert shake": "#9a8868",
  "birchwood": "#a09080", "heather blend": "#8a7e72", "sandalwood": "#a08868",
  "white oak": "#c0b8a8", "sandcastle": "#b0a080", "buff": "#c0a880",
  "cream": "#d8c8a8", "sand": "#c0b090", "sahara": "#baa478",
  "desert sand": "#c8b898", "khaki": "#a89878", "prairie": "#b8a888",
  "harvest gold": "#b89858", "golden cedar": "#a88848", "sunrise": "#c8a868",
  "capri": "#9a8878", "santa fe": "#c09068",

  // ── Green tones ──
  "hunter green": "#3a5040", "chateau green": "#3e5a48", "cascade green": "#3a5a48",
  "forest green": "#2e4a38", "forest green (metal)": "#2e4a38",
  "moss": "#4a5a40", "sage": "#6a7a60", "evergreen": "#2e4838",
  "emerald": "#2a5a3a", "jade": "#3a6a48", "pine green": "#2e4a3a",

  // ── Blue tones ──
  "harbor blue": "#4a5a6e", "appalachian sky": "#5a6878", "glacier": "#8a9aa8",
  "pacific blue": "#4a6070", "blue": "#3e5a70", "atlantic blue": "#3a5268",
  "midnight blue": "#2e3a50", "country blue": "#5a6a80", "harbor mist blue": "#6a7a8a",
  "ocean blue": "#3e5870",

  // ── Red / Burgundy tones ──
  "aged redwood": "#7a4838", "harvard slate": "#5a4858", "sierra brown": "#7a5a42",
  "colonial red": "#8a3a30", "terra cotta": "#c05a3a", "terracotta (metal)": "#b85838",
  "red blend": "#8a4238", "mesa red": "#9a4a38", "pacific redwood": "#6a3a30",
  "adobe sunset": "#b07050", "burgundy": "#5a2028", "barn red": "#7a2a20",
  "patriot red": "#8a3028", "rustic red": "#7a3830", "red": "#8a3830",

  // ── Multi-tone / Special ──
  "multi-width slate": "#5a5e62", "stone (metal)": "#8a8680",
  "charcoal (metal)": "#3a3c3e",
}

function getSwatchColor(colorName: string): string {
  const key = colorName.toLowerCase()
  return SWATCH_COLORS[key] || "#6b7280"
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
        const catText = await catRes.text()
        if (!catRes.ok) {
          console.error("[XRoof] catalog fetch error:", catRes.status, catText.slice(0, 200))
        } else {
          const catData = JSON.parse(catText)
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
                  image_url: p.image_url,
                })
              }
            }
            setCatalogProducts(flat)
          } else {
            console.error("[XRoof] unexpected catalog response:", catText.slice(0, 200))
          }
        }
      } catch (err) {
        console.error("[XRoof] catalog fetch failed:", err)
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
        <div className="mb-4 px-1">
          <div className="flex items-center justify-between">
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
          {brandPrefs[activeBrand] === false && (
            <p className="mt-1.5 text-[11px] text-amber-500">
              Customers viewing your estimates and portal will not see {activeBrand} products.
            </p>
          )}
        </div>

        {/* Products grouped by product_line */}
        {catalogLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : Object.keys(productsByLine).length === 0 ? (
          <div className="py-6 text-center text-xs">
            <p className="text-muted-foreground">No catalog products found for {activeBrand}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(productsByLine).map(([line, products]) => (
              <div key={line}>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{line}</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.color_name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0 border border-border" />
                      ) : (
                        <div
                          className="h-12 w-12 rounded-lg flex-shrink-0 border border-border"
                          style={{
                            backgroundColor: getSwatchColor(product.color_name),
                            backgroundImage: [
                              "radial-gradient(ellipse 2px 1.5px at 20% 25%, rgba(255,255,255,0.18) 0%, transparent 100%)",
                              "radial-gradient(ellipse 2px 1.5px at 70% 15%, rgba(0,0,0,0.22) 0%, transparent 100%)",
                              "radial-gradient(ellipse 1.5px 1px at 45% 55%, rgba(255,255,255,0.15) 0%, transparent 100%)",
                              "radial-gradient(ellipse 2px 1px at 80% 70%, rgba(0,0,0,0.18) 0%, transparent 100%)",
                              "radial-gradient(circle 1px at 15% 65%, rgba(255,255,255,0.12) 0%, transparent 100%)",
                              "radial-gradient(circle 1px at 60% 40%, rgba(0,0,0,0.14) 0%, transparent 100%)",
                              "radial-gradient(circle 1px at 35% 85%, rgba(255,255,255,0.1) 0%, transparent 100%)",
                              "radial-gradient(circle 1px at 90% 35%, rgba(0,0,0,0.16) 0%, transparent 100%)",
                              "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 5px)",
                              "repeating-linear-gradient(0deg, transparent 0px, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 6px)",
                              "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.15) 58%, rgba(0,0,0,0.12) 62%, transparent 65%)",
                              "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, transparent 35%, rgba(0,0,0,0.12) 100%)",
                            ].join(", "),
                          }}
                        />
                      )}
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
