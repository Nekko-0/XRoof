"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
} from "recharts"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MonthlyData = {
  month: string
  revenue?: number
  costs?: number
  profit?: number
  jobs?: number
  reports?: number
  cumulative?: number
  forecast?: boolean
  forecastRevenue?: number
}

type WeatherEvent = {
  date: string
  type: string
  description: string
}

type TickerItem = {
  text: string
  color: string
  amount?: number
}

type VelocityStage = {
  name: string
  avgDays: number
  benchmark: number
}

type ZipData = {
  zip: string
  revenue: number
  count: number
}

/* ------------------------------------------------------------------ */
/*  A) RevenueChart — with Storm Markers + C) Forecast Line           */
/* ------------------------------------------------------------------ */

export function RevenueChart({
  data,
  dataKey = "cumulative",
  weatherEvents,
  forecastMonths = 3,
  pipelineValue = 0,
  closeRate = 0,
}: {
  data: MonthlyData[]
  dataKey?: string
  weatherEvents?: WeatherEvent[]
  forecastMonths?: number
  pipelineValue?: number
  closeRate?: number
}) {
  // Build chart data with optional forecast extension
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const base = data.map((d) => ({ ...d, forecastRevenue: undefined as number | undefined }))

    // Calculate forecast if we have pipeline data
    if (pipelineValue > 0 && closeRate > 0) {
      const monthlyForecast = Math.round((pipelineValue * (closeRate / 100)) / forecastMonths)
      const lastCumulative = base[base.length - 1]?.cumulative || 0
      const lastMonth = base[base.length - 1]?.month || ""

      // Mark the last real point so the forecast line connects
      base[base.length - 1].forecastRevenue = lastCumulative

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const lastIdx = monthNames.indexOf(lastMonth)

      for (let i = 1; i <= forecastMonths; i++) {
        const mIdx = (lastIdx + i) % 12
        base.push({
          month: monthNames[mIdx],
          forecast: true,
          forecastRevenue: lastCumulative + monthlyForecast * i,
          cumulative: undefined,
          revenue: undefined,
          jobs: undefined,
          reports: undefined,
        })
      }
    }

    return base
  }, [data, pipelineValue, closeRate, forecastMonths])

  // Map weather events to month labels for reference lines
  const stormLines = useMemo(() => {
    if (!weatherEvents || weatherEvents.length === 0) return []
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return weatherEvents.map((e) => {
      const d = new Date(e.date)
      return { month: monthNames[d.getMonth()], ...e }
    })
  }, [weatherEvents])

  const hasForecast = chartData.some((d) => d.forecast)
  const forecastTotal = chartData.filter((d) => d.forecast).slice(-1)[0]?.forecastRevenue

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">Revenue</h4>
        {hasForecast && forecastTotal != null && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            Projected ${forecastTotal.toLocaleString()}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Cumulative revenue over 12 months</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: "#e5e5e5" }}
              labelStyle={{ color: "#e5e5e5", fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                if (name === "forecastRevenue") return [`$${value.toLocaleString()}`, "Projected"]
                return [`$${value.toLocaleString()}`, "Revenue"]
              }}
            />
            {/* Storm / weather reference lines */}
            {stormLines.map((s, i) => (
              <ReferenceLine
                key={i}
                x={s.month}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: s.type === "hail" ? "\u26C8" : "\u2601", position: "top", fill: "#f59e0b", fontSize: 14 }}
              />
            ))}
            {/* Main revenue area */}
            <Area type="monotone" dataKey={dataKey} stroke="#22c55e" strokeWidth={2} fill="url(#revenueGrad)" connectNulls={false} />
            {/* Forecast line */}
            {hasForecast && (
              <Line
                type="monotone"
                dataKey="forecastRevenue"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  JobsChart — visual upgrade                                        */
/* ------------------------------------------------------------------ */

export function JobsChart({ data, barKey = "jobs", label = "Jobs Completed" }: { data: MonthlyData[]; barKey?: string; label?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-foreground">{label}</h4>
      <p className="mb-3 text-xs text-muted-foreground">Per month over 12 months</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: "#e5e5e5" }}
              labelStyle={{ color: "#e5e5e5", fontWeight: 600 }}
            />
            <Bar dataKey={barKey} fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  MiniStatCard — with change badge + sparkline                      */
/* ------------------------------------------------------------------ */

export function MiniStatCard({
  label,
  value,
  trend,
  change,
  sparkData,
}: {
  label: string
  value: string
  trend?: "up" | "down" | "flat"
  change?: string
  sparkData?: number[]
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {trend === "up" && <span className="text-xs font-semibold text-emerald-400">&uarr;</span>}
        {trend === "down" && <span className="text-xs font-semibold text-red-400">&darr;</span>}
        {change && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            change.startsWith("+") ? "bg-emerald-500/10 text-emerald-400" :
            change.startsWith("-") ? "bg-red-500/10 text-red-400" :
            "bg-secondary text-muted-foreground"
          }`}>
            {change}
          </span>
        )}
      </div>
      {/* Tiny sparkline */}
      {sparkData && sparkData.length > 1 && (
        <div className="mt-2 h-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData.map((v, i) => ({ i, v }))} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="#22c55e"
                strokeWidth={1.5}
                fill={`url(#spark-${label.replace(/\s/g, "")})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  B) PipelineTicker — live scrolling activity bar                   */
/* ------------------------------------------------------------------ */

export function PipelineTicker({ items }: { items: TickerItem[] }) {
  if (!items || items.length === 0) return null

  // Double items for seamless loop
  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center">
        <span className="flex-shrink-0 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-primary">
          Live
        </span>
        <div className="relative flex-1 overflow-hidden py-2">
          <div className="ticker-scroll flex gap-6 whitespace-nowrap px-4">
            {doubled.map((item, i) => {
              const colorClass =
                item.color === "emerald" ? "text-emerald-400" :
                item.color === "blue" ? "text-blue-400" :
                item.color === "amber" ? "text-amber-400" :
                "text-muted-foreground"
              const dotClass =
                item.color === "emerald" ? "bg-emerald-400" :
                item.color === "blue" ? "bg-blue-400" :
                item.color === "amber" ? "bg-amber-400" :
                "bg-muted-foreground"
              return (
                <span key={i} className="inline-flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                  <span className="font-medium text-muted-foreground">{item.text}</span>
                  {item.amount != null && (
                    <span className={`font-bold ${colorClass}`}>
                      {item.amount >= 0 ? "+" : ""}${Math.abs(item.amount).toLocaleString()}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroll {
          animation: ticker 30s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  D) DealVelocityMeter                                              */
/* ------------------------------------------------------------------ */

export function DealVelocityMeter({ stages }: { stages: VelocityStage[] }) {
  const hasData = stages && stages.length > 0 && stages.some((s) => s.avgDays > 0)

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h4 className="mb-2 text-sm font-bold text-foreground">Deal Velocity</h4>
        <p className="text-sm text-muted-foreground">Move jobs through your pipeline to see real stage timing.</p>
      </div>
    )
  }

  const totalDays = stages.reduce((sum, s) => sum + s.avgDays, 0)
  const totalBenchmark = stages.reduce((sum, s) => sum + s.benchmark, 0)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground">Deal Velocity</h4>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            totalDays <= totalBenchmark ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          }`}>
            Your avg: {totalDays}d
          </span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            Industry avg: {totalBenchmark}d
          </span>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Average days per stage: Lead &rarr; Estimate &rarr; Signed &rarr; Completed</p>

      {/* Segmented horizontal bar */}
      <div className="flex h-10 w-full overflow-hidden rounded-xl">
        {stages.map((stage) => {
          const pct = totalDays > 0 ? (stage.avgDays / totalDays) * 100 : 25
          const isFaster = stage.avgDays <= stage.benchmark
          return (
            <div
              key={stage.name}
              className={`flex flex-col items-center justify-center border-r border-background/20 last:border-r-0 ${
                isFaster ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
              style={{ width: `${Math.max(pct, 10)}%` }}
              title={`${stage.name}: ${stage.avgDays}d (benchmark: ${stage.benchmark}d)`}
            >
              <span className="text-[10px] font-bold text-foreground truncate px-1">{stage.name}</span>
              <span className={`text-[9px] font-semibold ${isFaster ? "text-emerald-400" : "text-red-400"}`}>
                {stage.avgDays}d
              </span>
            </div>
          )
        })}
      </div>

      {/* Stage detail row */}
      <div className="mt-3 flex gap-2">
        {stages.map((stage) => {
          const isFaster = stage.avgDays <= stage.benchmark
          return (
            <div key={stage.name} className="flex-1 rounded-lg bg-secondary/30 p-2 text-center">
              <p className="text-[10px] font-medium text-muted-foreground">{stage.name}</p>
              <p className={`text-sm font-bold ${isFaster ? "text-emerald-400" : "text-red-400"}`}>
                {stage.avgDays}d
              </p>
              <p className="text-[9px] text-muted-foreground">bench: {stage.benchmark}d</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  E) ZipHeatmap — revenue density by zip code                       */
/* ------------------------------------------------------------------ */

export function ZipHeatmap({ data }: { data: ZipData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h4 className="mb-2 text-sm font-bold text-foreground">Revenue by Zip Code</h4>
        <p className="text-sm text-muted-foreground">Add zip codes to job addresses to see your revenue heatmap.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  const maxRevenue = sorted[0]?.revenue || 1

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-foreground">Revenue by Zip Code</h4>
      <p className="mb-4 text-xs text-muted-foreground">Job density and revenue concentration</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((z) => {
          const intensity = Math.max(0.1, z.revenue / maxRevenue)
          return (
            <div
              key={z.zip}
              className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/20 p-3 transition-transform hover:scale-105"
              style={{ backgroundColor: `rgba(34, 197, 94, ${intensity * 0.25})` }}
            >
              <span className="text-sm font-bold text-foreground">{z.zip}</span>
              <span className="text-xs font-semibold text-emerald-400">${z.revenue.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{z.count} job{z.count !== 1 ? "s" : ""}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  F) ProfitChart — Revenue vs Costs with Profit Line                */
/* ------------------------------------------------------------------ */

export function ProfitChart({ data }: { data: MonthlyData[] }) {
  const hasData = data && data.some((d) => (d.costs || 0) > 0 || (d.revenue || 0) > 0)
  if (!hasData) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-foreground">Profit Overview</h4>
      <p className="mb-3 text-xs text-muted-foreground">Monthly revenue vs costs with profit margin</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="costsBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: "#e5e5e5" }}
              labelStyle={{ color: "#e5e5e5", fontWeight: 600 }}
              formatter={(value: number, name: string) => {
                const label = name === "revenue" ? "Revenue" : name === "costs" ? "Costs" : "Profit"
                return [`$${value.toLocaleString()}`, label]
              }}
            />
            <Bar dataKey="revenue" fill="url(#revenueBarGrad)" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="costs" fill="url(#costsBarGrad)" radius={[4, 4, 0, 0]} barSize={20} />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Revenue</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-500" /> Costs</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Profit</span>
      </div>
    </div>
  )
}
