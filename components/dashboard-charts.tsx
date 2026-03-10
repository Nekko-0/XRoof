"use client"

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
} from "recharts"

type MonthlyData = {
  month: string
  revenue?: number
  jobs?: number
  reports?: number
  cumulative?: number
}

export function RevenueChart({ data, dataKey = "cumulative" }: { data: MonthlyData[]; dataKey?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-foreground">Revenue</h4>
      <p className="mb-3 text-xs text-muted-foreground">Cumulative revenue over 12 months</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={45} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12, color: "#e5e5e5" }}
              labelStyle={{ color: "#e5e5e5", fontWeight: 600 }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
            />
            <Area type="monotone" dataKey={dataKey} stroke="#22c55e" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function JobsChart({ data, barKey = "jobs", label = "Jobs Completed" }: { data: MonthlyData[]; barKey?: string; label?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <h4 className="mb-1 text-sm font-bold text-foreground">{label}</h4>
      <p className="mb-3 text-xs text-muted-foreground">Per month over 12 months</p>
      <div className="h-48">
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

export function MiniStatCard({ label, value, trend }: { label: string; value: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {trend === "up" && <span className="text-xs font-semibold text-emerald-400">↑</span>}
        {trend === "down" && <span className="text-xs font-semibold text-red-400">↓</span>}
      </div>
    </div>
  )
}
