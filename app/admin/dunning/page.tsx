"use client"

import { useEffect, useState } from "react"
import { authFetch } from "@/lib/auth-fetch"
import Link from "next/link"
import {
  ArrowLeft, Mail, DollarSign, Send, CheckCircle2,
  Save, ToggleLeft, ToggleRight, RefreshCw,
} from "lucide-react"

type DunningStats = {
  totalSent: number
  recovered: number
  revenueSaved: number
}

type DunningSettings = {
  enabled: boolean
  templates: {
    day1: { subject: string; body: string }
    day3: { subject: string; body: string }
    day7: { subject: string; body: string }
  }
}

type DunningSequence = {
  id: string
  contractor_name: string
  step: string
  sent_date: string
  recovered: boolean
}

const DEFAULT_SETTINGS: DunningSettings = {
  enabled: false,
  templates: {
    day1: { subject: "", body: "" },
    day3: { subject: "", body: "" },
    day7: { subject: "", body: "" },
  },
}

export default function AdminDunningPage() {
  const [stats, setStats] = useState<DunningStats>({ totalSent: 0, recovered: 0, revenueSaved: 0 })
  const [settings, setSettings] = useState<DunningSettings>(DEFAULT_SETTINGS)
  const [sequences, setSequences] = useState<DunningSequence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchData = () => {
    setLoading(true)
    setError("")
    authFetch("/api/admin/dunning")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dunning data")
        return res.json()
      })
      .then((data) => {
        setStats(data.stats || { totalSent: 0, recovered: 0, revenueSaved: 0 })
        setSettings(data.settings || DEFAULT_SETTINGS)
        setSequences(data.sequences || [])
      })
      .catch(() => setError("Failed to load dunning data"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    setSaving(true)
    setSuccess("")
    setError("")
    try {
      const res = await authFetch("/api/admin/dunning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSuccess("Settings saved successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const updateTemplate = (
    step: "day1" | "day3" | "day7",
    field: "subject" | "body",
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [step]: { ...prev.templates[step], [field]: value },
      },
    }))
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
            Dunning Management
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Automated payment recovery for failed subscriptions
          </p>
        </div>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-900/30 text-indigo-400">
            <Send className="h-4 w-4" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.totalSent}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Total Sent</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">{stats.recovered}</p>
          <p className="text-[10px] font-medium text-muted-foreground">Recovered</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
            <DollarSign className="h-4 w-4" />
          </div>
          <p className="mt-2 text-xl font-bold text-foreground">
            ${stats.revenueSaved.toLocaleString()}
          </p>
          <p className="text-[10px] font-medium text-muted-foreground">Revenue Saved</p>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Dunning Settings
          </h3>
          <button
            onClick={() =>
              setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className="flex items-center gap-2 text-sm font-medium"
          >
            {settings.enabled ? (
              <>
                <ToggleRight className="h-5 w-5 text-emerald-600" />
                <span className="text-emerald-600">Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">Disabled</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {(["day1", "day3", "day7"] as const).map((step) => {
            const labels = { day1: "Day 1 — First Notice", day3: "Day 3 — Second Reminder", day7: "Day 7 — Final Warning" }
            return (
              <div key={step} className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-semibold text-foreground">{labels[step]}</h4>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={settings.templates[step].subject}
                      onChange={(e) => updateTemplate(step, "subject", e.target.value)}
                      placeholder={`Email subject for ${step}...`}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Body
                    </label>
                    <textarea
                      value={settings.templates[step].body}
                      onChange={(e) => updateTemplate(step, "body", e.target.value)}
                      placeholder={`Email body for ${step}...`}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Sequences Table */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dunning Sequences
        </h3>
        {sequences.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No dunning sequences yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Contractor</th>
                  <th className="pb-2 pr-4 font-medium">Step</th>
                  <th className="pb-2 pr-4 font-medium">Sent Date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq) => (
                  <tr
                    key={seq.id}
                    className="border-b border-border/50 hover:bg-secondary/30"
                  >
                    <td className="py-2.5 pr-4 font-medium text-foreground">
                      {seq.contractor_name}
                    </td>
                    <td className="py-2.5 pr-4 capitalize text-muted-foreground">
                      {seq.step}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {new Date(seq.sent_date).toLocaleDateString()}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          seq.recovered
                            ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {seq.recovered ? "Recovered" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
