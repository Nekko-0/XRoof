"use client"

import { useState, useEffect } from "react"
import { authFetch } from "@/lib/auth-fetch"
import { Trash2, TrendingUp, ChevronDown } from "lucide-react"

type JobCost = {
  id: string
  category: string
  description: string
  amount: number
}

const COST_CATEGORIES = ["Materials", "Labor", "Subcontractor", "Permits", "Dumpster", "Other"]

interface JobCostEntryProps {
  jobId: string
  revenue: number
  canEdit: boolean
  compact?: boolean
  initialCosts?: JobCost[]
  autoLoad?: boolean
  onCostsChange?: (totalCosts: number) => void
}

export function JobCostEntry({ jobId, revenue, canEdit, compact, initialCosts, autoLoad = true, onCostsChange }: JobCostEntryProps) {
  const [costs, setCosts] = useState<JobCost[]>(initialCosts || [])
  const [loaded, setLoaded] = useState(!!initialCosts)
  const [showCosts, setShowCosts] = useState(false)
  const [newCost, setNewCost] = useState({ category: "Materials", description: "", amount: "" })

  useEffect(() => {
    if (autoLoad && !loaded) {
      authFetch(`/api/jobs/costs?job_id=${jobId}`)
        .then((r) => r.json())
        .then((data) => { setCosts(Array.isArray(data) ? data : []); setLoaded(true) })
        .catch(() => setLoaded(true))
    }
  }, [autoLoad, loaded, jobId])

  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0)
  const profit = revenue - totalCosts
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  const handleAdd = async () => {
    if (!newCost.amount || !newCost.category) return
    const res = await authFetch("/api/jobs/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, category: newCost.category, description: newCost.description, amount: parseFloat(newCost.amount) }),
    })
    const data = await res.json()
    if (data.id) {
      const next = [...costs, data]
      setCosts(next)
      setNewCost({ category: "Materials", description: "", amount: "" })
      onCostsChange?.(next.reduce((sum, c) => sum + Number(c.amount), 0))
    }
  }

  const handleDelete = async (id: string) => {
    await authFetch(`/api/jobs/costs?id=${id}`, { method: "DELETE" })
    const next = costs.filter((c) => c.id !== id)
    setCosts(next)
    onCostsChange?.(next.reduce((sum, c) => sum + Number(c.amount), 0))
  }

  return (
    <div>
      <button
        onClick={() => setShowCosts(!showCosts)}
        className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <TrendingUp className="h-3 w-3" /> Job Costs & Profit
        {totalCosts > 0 && (
          <span className={`ml-1 normal-case tracking-normal ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            ({margin}%)
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${showCosts ? "rotate-180" : ""}`} />
      </button>

      {showCosts && (
        <div className="space-y-2">
          {(revenue > 0 || totalCosts > 0) && (
            <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-secondary/30 p-2">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Revenue</p>
                <p className="text-[11px] font-bold text-emerald-500">${revenue.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Costs</p>
                <p className="text-[11px] font-bold text-red-400">${totalCosts.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Margin</p>
                <p className={`text-[11px] font-bold ${margin >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {margin}%
                </p>
              </div>
            </div>
          )}

          {costs.length > 0 && (
            <div className="space-y-1">
              {costs.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-2 py-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="rounded bg-secondary px-1 py-0.5 text-[9px] font-bold text-muted-foreground">{c.category}</span>
                    {c.description && <span className="text-[10px] text-muted-foreground/60 truncate">{c.description}</span>}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-[11px] font-bold text-foreground">${Number(c.amount).toLocaleString()}</span>
                    {canEdit && (
                      <button onClick={() => handleDelete(c.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <div className="flex items-center gap-1">
              <select
                value={newCost.category}
                onChange={(e) => setNewCost({ ...newCost, category: e.target.value })}
                className="rounded-md border border-border/50 bg-background px-1 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                {COST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                value={newCost.description}
                onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                placeholder="Desc..."
                className="flex-1 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <input
                type="number"
                value={newCost.amount}
                onChange={(e) => setNewCost({ ...newCost, amount: e.target.value })}
                placeholder="$"
                className="w-16 rounded-md border border-border/50 bg-background px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={handleAdd}
                disabled={!newCost.amount}
                className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Inline profit badge for compact display on cards */
export function ProfitBadge({ revenue, totalCosts }: { revenue: number; totalCosts: number }) {
  if (totalCosts <= 0) return null
  const profit = revenue - totalCosts
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

  return (
    <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
      margin >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
    }`}>
      <TrendingUp className="h-2.5 w-2.5" />
      {margin}% margin
    </span>
  )
}
