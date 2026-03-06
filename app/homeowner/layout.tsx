"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { AuthGuard } from "@/components/auth-guard"

export default function HomeownerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell role="homeowner">{children}</DashboardShell>
    </AuthGuard>
  )
}
