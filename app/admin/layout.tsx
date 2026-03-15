"use client"

import { AdminGuard } from "@/components/admin-guard"
import { DashboardShell } from "@/components/dashboard-shell"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <DashboardShell role="admin">{children}</DashboardShell>
    </AdminGuard>
  )
}
