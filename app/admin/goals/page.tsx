"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, Target, Plus, Trash2, RefreshCw, Calendar,
  DollarSign, TrendingUp,
} from "lucide-react"

type Goal = {
  id: string
  period: "monthly" | "quarterly" | "annual"
  target_amount: number
  start_date: string
  end_date: string
  current_mrr?: number
  progress?: number
}

export default function AdminGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)

  // Form state
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "annual">("monthly")
  const [targetAmount, setTargetAmount] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const fetchGoals = () => {
    setLoading(true)
    setError("")
    authFetch("/api/admin/goals")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load goals")
        return res.json()
      })
      .then((data) => setGoals(data.goals || []))
      .catch(() => setError("Failed to load goals"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGoals() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetAmount || !startDate || !endDate) return
    setCreating(true)
    setError("")
    try {
      const res = await authFetch("/api/admin/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          target_amount: parseFloat(targetAmount),
          start_date: startDate,
          end_date: endDate,
        }),
      })
      if (!res.ok) throw new Error("Failed to create goal")
      setTargetAmount("")
      setStartDate("")
      setEndDate("")
      fetchGoals()
    } catch {
      setError("Failed to create goal")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError("")
    try {
      const res = await authFetch(`/api/admin/goals?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete goal")
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch {
      setError("Failed to delete goal")
    }
  }

  const periodColors: Record<string, string> = {
    monthly: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    quarterly: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    annual: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Revenue Goals
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Set and track revenue targets by period
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create Goal Form */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Plus className="h-4 w-4 text-indigo-400" />
          New Goal
        </h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Goal["period"])}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Target Amount ($)
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="10000"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {creating ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>

      {/* Goals List */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="h-4 w-4 text-amber-400" />
          Active Goals ({goals.length})
        </h3>
        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No goals created yet
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((goal) => {
              const progress = goal.progress ?? 0
              const progressPct = goal.target_amount > 0
                ? Math.min(Math.round((progress / goal.target_amount) * 100), 100)
                : 0
              return (
                <div
                  key={goal.id}
                  className="rounded-xl border border-border bg-secondary/20 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-900/30">
                        <DollarSign className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-foreground">
                            ${goal.target_amount.toLocaleString()}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              periodColors[goal.period] || "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {goal.period}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(goal.start_date).toLocaleDateString()} — {new Date(goal.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        ${progress.toLocaleString()} of ${goal.target_amount.toLocaleString()}
                      </span>
                      <span className="font-medium text-foreground">{progressPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary/50">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          progressPct >= 100
                            ? "bg-emerald-500"
                            : progressPct >= 50
                            ? "bg-indigo-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {goal.current_mrr !== undefined && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      Current MRR: ${goal.current_mrr.toLocaleString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
