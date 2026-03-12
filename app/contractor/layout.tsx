"use client"

import { DashboardShell } from "@/components/dashboard-shell"
import { AuthGuard } from "@/components/auth-guard"
import { RoleProvider } from "@/lib/role-context"
import { OfflineIndicator } from "@/components/offline-indicator"
import { PushPrompt } from "@/components/push-prompt"
import { InstallPrompt } from "@/components/install-prompt"

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleProvider>
        <DashboardShell role="contractor">{children}</DashboardShell>
        <OfflineIndicator />
        <PushPrompt />
        <InstallPrompt />
      </RoleProvider>
    </AuthGuard>
  )
}
