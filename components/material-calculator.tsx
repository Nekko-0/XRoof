"use client"

import { useState, useMemo } from "react"
import { Calculator, Package, Download, Settings, ChevronDown, ChevronUp } from "lucide-react"

type MaterialPrices = {
  shingle_bundle?: number
  underlayment_roll?: number
  drip_edge?: number
  ridge_cap?: number
  starter_strip?: number
  nails_box?: number
  ice_water_shield?: number
  pipe_boot?: number
  vent?: number
}

// Default material prices (industry averages)
const DEFAULT_PRICES: Required<MaterialPrices> = {
  shingle_bundle: 35,
  underlayment_roll: 45,
  drip_edge: 8,
  ridge_cap: 32,
  starter_strip: 25,
  nails_box: 30,
  ice_water_shield: 65,
  pipe_boot: 15,
  vent: 45,
}

const PRICE_LABELS: Record<keyof MaterialPrices, string> = {
  shingle_bundle: "Shingle Bundle",
  underlayment_roll: "Underlayment Roll",
  drip_edge: "Drip Edge (10ft)",
  ridge_cap: "Ridge Cap Bundle",
  starter_strip: "Starter Strip Roll",
  nails_box: "Nails (box)",
  ice_water_shield: "Ice & Water Shield",
  pipe_boot: "Pipe Boot",
  vent: "Roof Vent",
}

// Pitch multiplier for slope adjustment
const PITCH_MULTIPLIER: Record<string, number> = {
  "1/12": 1.003, "2/12": 1.014, "3/12": 1.031, "4/12": 1.054,
  "5/12": 1.083, "6/12": 1.118, "7/12": 1.158, "8/12": 1.202,
  "9/12": 1.250, "10/12": 1.302, "11/12": 1.357, "12/12": 1.414,
}

interface MaterialCalculatorProps {
  roofAreaSqft?: number
  pitch?: string
  wasteFactor?: number
  edgeLengths?: { eaves?: number; ridges?: number; valleys?: number; rakes?: number }
  customPrices?: MaterialPrices
  pipeBootCount?: number
  ventCount?: number
  onExport?: (materials: MaterialLine[]) => void
  compact?: boolean
}

export type MaterialLine = {
  item: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
}

export function MaterialCalculator({
  roofAreaSqft = 0,
  pitch = "4/12",
  wasteFactor = 15,
  edgeLengths,
  customPrices,
  pipeBootCount,
  ventCount,
  onExport,
  compact = false,
}: MaterialCalculatorProps) {
  const [areaInput, setAreaInput] = useState(roofAreaSqft.toString())
  const [pitchInput, setPitchInput] = useState(pitch)
  const [wasteInput, setWasteInput] = useState(wasteFactor.toString())
  const [pipeBoots, setPipeBoots] = useState(pipeBootCount?.toString() || "3")
  const [vents, setVents] = useState(ventCount?.toString() || "2")
  const [showPrices, setShowPrices] = useState(false)
  const [prices, setPrices] = useState<Required<MaterialPrices>>({ ...DEFAULT_PRICES, ...customPrices })

  const updatePrice = (key: keyof MaterialPrices, value: string) => {
    setPrices((prev) => ({ ...prev, [key]: Number(value) || 0 }))
  }

  const materials = useMemo(() => {
    const area = parseFloat(areaInput) || 0
    if (area === 0) return []

    const pitchMult = PITCH_MULTIPLIER[pitchInput] || 1.054
    const waste = (parseFloat(wasteInput) || 15) / 100
    const adjustedArea = area * pitchMult * (1 + waste)
    const squares = adjustedArea / 100

    const eavesFt = edgeLengths?.eaves || Math.sqrt(area) * 2
    const ridgeFt = edgeLengths?.ridges || Math.sqrt(area)
    const valleyFt = edgeLengths?.valleys || 0
    const rakesFt = edgeLengths?.rakes || Math.sqrt(area) * 1.5

    const lines: MaterialLine[] = [
      {
        item: "Shingle Bundles",
        quantity: Math.ceil(squares * 3),
        unit: "bundles",
        unitPrice: prices.shingle_bundle,
        total: Math.ceil(squares * 3) * prices.shingle_bundle,
      },
      {
        item: "Underlayment Rolls",
        quantity: Math.ceil(squares / 4),
        unit: "rolls",
        unitPrice: prices.underlayment_roll,
        total: Math.ceil(squares / 4) * prices.underlayment_roll,
      },
      {
        item: "Drip Edge (10ft pieces)",
        quantity: Math.ceil((eavesFt + rakesFt) / 10),
        unit: "pieces",
        unitPrice: prices.drip_edge,
        total: Math.ceil((eavesFt + rakesFt) / 10) * prices.drip_edge,
      },
      {
        item: "Ridge Cap",
        quantity: Math.ceil(ridgeFt / 33),
        unit: "bundles",
        unitPrice: prices.ridge_cap,
        total: Math.ceil(ridgeFt / 33) * prices.ridge_cap,
      },
      {
        item: "Starter Strip",
        quantity: Math.ceil(eavesFt / 120),
        unit: "rolls",
        unitPrice: prices.starter_strip,
        total: Math.ceil(eavesFt / 120) * prices.starter_strip,
      },
      {
        item: "Roofing Nails",
        quantity: Math.ceil(squares / 3),
        unit: "boxes",
        unitPrice: prices.nails_box,
        total: Math.ceil(squares / 3) * prices.nails_box,
      },
    ]

    // Pipe boots
    const boots = parseInt(pipeBoots) || 0
    if (boots > 0) {
      lines.push({
        item: "Pipe Boots",
        quantity: boots,
        unit: "pcs",
        unitPrice: prices.pipe_boot,
        total: boots * prices.pipe_boot,
      })
    }

    // Vents
    const ventQty = parseInt(vents) || 0
    if (ventQty > 0) {
      lines.push({
        item: "Roof Vents",
        quantity: ventQty,
        unit: "pcs",
        unitPrice: prices.vent,
        total: ventQty * prices.vent,
      })
    }

    // Add ice & water shield if valleys/eaves exist
    if (valleyFt > 0 || eavesFt > 0) {
      const shieldFt = valleyFt + eavesFt * 0.3
      const rolls = Math.ceil(shieldFt / 66)
      if (rolls > 0) {
        lines.push({
          item: "Ice & Water Shield",
          quantity: rolls,
          unit: "rolls",
          unitPrice: prices.ice_water_shield,
          total: rolls * prices.ice_water_shield,
        })
      }
    }

    return lines
  }, [areaInput, pitchInput, wasteInput, pipeBoots, vents, edgeLengths, prices])

  const totalCost = materials.reduce((sum, m) => sum + m.total, 0)

  const handleDownloadCSV = () => {
    if (materials.length === 0) return
    const header = "Material,Quantity,Unit,Unit Price,Total\n"
    const rows = materials.map((m) => `"${m.item}",${m.quantity},${m.unit},${m.unitPrice},${m.total}`).join("\n")
    const footer = `\n"TOTAL",,,,${totalCost}`
    const blob = new Blob([header + rows + footer], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `material-order-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm ${compact ? "p-4" : "p-5"}`}>
      <h3 className={`mb-4 flex items-center gap-2 font-bold text-foreground ${compact ? "text-xs" : "text-sm"}`}>
        <Calculator className="h-4 w-4 text-primary" /> Material Calculator
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-4">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Roof Area (sqft)
          </label>
          <input
            type="number"
            value={areaInput}
            onChange={(e) => setAreaInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pitch
          </label>
          <select
            value={pitchInput}
            onChange={(e) => setPitchInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            {Object.keys(PITCH_MULTIPLIER).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Waste %
          </label>
          <input
            type="number"
            value={wasteInput}
            onChange={(e) => setWasteInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pipe Boots
          </label>
          <input
            type="number"
            value={pipeBoots}
            onChange={(e) => setPipeBoots(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Vents
          </label>
          <input
            type="number"
            value={vents}
            onChange={(e) => setVents(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Editable Unit Prices */}
      <button
        onClick={() => setShowPrices(!showPrices)}
        className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="h-3 w-3" />
        Customize Material Prices
        {showPrices ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {showPrices && (
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-3 sm:grid-cols-3">
          {(Object.keys(PRICE_LABELS) as (keyof MaterialPrices)[]).map((key) => (
            <div key={key}>
              <label className="mb-0.5 block text-[9px] font-medium text-muted-foreground">{PRICE_LABELS[key]}</label>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">$</span>
                <input
                  type="number"
                  value={prices[key]}
                  onChange={(e) => updatePrice(key, e.target.value)}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {materials.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/50">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Material</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">$/Unit</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-foreground">{m.item}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{m.quantity}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{m.unit}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">${m.unitPrice}</td>
                    <td className="px-3 py-2 text-right font-bold text-foreground">${m.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-primary/5">
                  <td colSpan={4} className="px-3 py-2 font-bold text-foreground">Estimated Material Cost</td>
                  <td className="px-3 py-2 text-right text-base font-bold text-primary">${totalCost.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV
            </button>
            {onExport && (
              <button
                onClick={() => onExport(materials)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Package className="h-3.5 w-3.5" /> Copy to Estimate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
