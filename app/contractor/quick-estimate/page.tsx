"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calculator, ArrowRight, ChevronDown } from "lucide-react"
import { useRole } from "@/lib/role-context"
import { supabase } from "@/lib/supabaseClient"

const DEFAULT_PRICES: Record<string, number> = {
  "3_tab": 350,
  architectural: 450,
  premium: 600,
  metal: 900,
  flat_tpo: 500,
}

const MATERIAL_DEFS: { key: string; label: string }[] = [
  { key: "3_tab", label: "3-Tab Shingles" },
  { key: "architectural", label: "Architectural Shingles" },
  { key: "premium", label: "Premium Shingles" },
  { key: "metal", label: "Metal Roofing" },
  { key: "flat_tpo", label: "Flat/TPO" },
]

const PITCHES: { label: string; multiplier: number }[] = [
  { label: "4/12", multiplier: 1.0 },
  { label: "5/12", multiplier: 1.0 },
  { label: "6/12", multiplier: 1.05 },
  { label: "7/12", multiplier: 1.1 },
  { label: "8/12", multiplier: 1.15 },
  { label: "9/12", multiplier: 1.2 },
  { label: "10/12", multiplier: 1.3 },
  { label: "12/12", multiplier: 1.5 },
]

const COMPLEXITIES: { label: string; multiplier: number }[] = [
  { label: "Simple", multiplier: 1.0 },
  { label: "Moderate", multiplier: 1.15 },
  { label: "Complex", multiplier: 1.35 },
]

type EstimateLineItem = {
  description: string
  quantity: number
  unit_price: number
}

export default function QuickEstimatePage() {
  const router = useRouter()
  const { accountId } = useRole()
  const [squares, setSquares] = useState("")
  const [materialIdx, setMaterialIdx] = useState(1) // default to Architectural
  const [pitchIdx, setPitchIdx] = useState(0)
  const [complexityIdx, setComplexityIdx] = useState(0)
  const [prices, setPrices] = useState<Record<string, number>>(DEFAULT_PRICES)

  // Fetch contractor's custom prices
  useEffect(() => {
    if (!accountId) return
    supabase
      .from("profiles")
      .select("estimate_prices")
      .eq("id", accountId)
      .single()
      .then(({ data }) => {
        if (data?.estimate_prices) {
          setPrices({ ...DEFAULT_PRICES, ...data.estimate_prices })
        }
      })
  }, [accountId])

  const materials = useMemo(
    () => MATERIAL_DEFS.map((m) => ({ label: m.label, key: m.key, basePrice: prices[m.key] || DEFAULT_PRICES[m.key] })),
    [prices]
  )

  const material = materials[materialIdx]
  const pitch = PITCHES[pitchIdx]
  const complexity = COMPLEXITIES[complexityIdx]
  const sqNum = parseFloat(squares) || 0

  const estimate = useMemo(() => {
    if (sqNum <= 0) return null
    const base = sqNum * material.basePrice
    const low = base * pitch.multiplier * 0.9
    const high = base * pitch.multiplier * complexity.multiplier * 1.1
    return { low, high, base, pitchMult: pitch.multiplier, complexMult: complexity.multiplier }
  }, [sqNum, material.basePrice, pitch.multiplier, complexity.multiplier])

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

  const handleCreateEstimate = () => {
    if (!estimate) return
    const midPrice = (estimate.low + estimate.high) / 2
    const unitPrice = midPrice / sqNum
    const items: EstimateLineItem[] = [
      {
        description: `${material.label} — ${pitch.label} pitch, ${complexity.label.toLowerCase()} complexity`,
        quantity: sqNum,
        unit_price: Math.round(unitPrice * 100) / 100,
      },
    ]
    sessionStorage.setItem("material_estimate_items", JSON.stringify(items))
    router.push("/contractor/report-builder")
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Quick Estimate
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a ballpark price range in seconds
        </p>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
        {/* Roof Squares */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Roof Squares
          </label>
          <input
            type="number"
            value={squares}
            onChange={(e) => setSquares(e.target.value)}
            placeholder="e.g. 25"
            min="0"
            step="0.1"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-muted-foreground">1 square = 100 sq ft</p>
        </div>

        {/* Pitch */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Roof Pitch
          </label>
          <div className="relative">
            <select
              value={pitchIdx}
              onChange={(e) => setPitchIdx(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PITCHES.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label} {p.multiplier > 1 ? `(+${Math.round((p.multiplier - 1) * 100)}%)` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Material Type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Material Type
          </label>
          <div className="relative">
            <select
              value={materialIdx}
              onChange={(e) => setMaterialIdx(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {materials.map((m, i) => (
                <option key={m.key} value={i}>
                  {m.label} — ${m.basePrice}/sq
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Complexity */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Complexity
          </label>
          <div className="grid grid-cols-3 gap-2">
            {COMPLEXITIES.map((c, i) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setComplexityIdx(i)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  complexityIdx === i
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.label}
                {c.multiplier > 1 && (
                  <span className="block text-xs opacity-70">
                    +{Math.round((c.multiplier - 1) * 100)}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Card */}
      {estimate && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Estimated Range
          </div>
          <div
            className="text-center text-3xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {formatCurrency(estimate.low)} — {formatCurrency(estimate.high)}
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Squares</span>
              <span className="text-foreground">{sqNum}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material</span>
              <span className="text-foreground">{material.label} (${material.basePrice}/sq)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pitch</span>
              <span className="text-foreground">
                {pitch.label}
                {estimate.pitchMult > 1 && ` (+${Math.round((estimate.pitchMult - 1) * 100)}%)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Complexity</span>
              <span className="text-foreground">
                {complexity.label}
                {estimate.complexMult > 1 && ` (+${Math.round((estimate.complexMult - 1) * 100)}%)`}
              </span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between font-medium">
              <span className="text-muted-foreground">Base total</span>
              <span className="text-foreground">{formatCurrency(estimate.base)}</span>
            </div>
          </div>

          {/* Create Estimate Button */}
          <button
            onClick={handleCreateEstimate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create Full Estimate
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
