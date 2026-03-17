"use client"

import { useEffect } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { AuthGuard } from "@/components/auth-guard"
import { RoleProvider } from "@/lib/role-context"
import { EventProvider } from "@/components/event-provider"
import { OfflineIndicator } from "@/components/offline-indicator"
import { PushPrompt } from "@/components/push-prompt"
import { InstallPrompt } from "@/components/install-prompt"

function CrispWidget() {
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID
    if (!websiteId) return

    // Avoid loading twice
    if ((window as any).$crisp) return

    ;(window as any).$crisp = []
    ;(window as any).CRISP_WEBSITE_ID = websiteId

    const s = document.createElement("script")
    s.src = "https://client.crisp.chat/l.js"
    s.async = true
    document.head.appendChild(s)

    return () => {
      try { document.head.removeChild(s) } catch {}
    }
  }, [])

  return null
}

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <RoleProvider>
        <EventProvider>
          <DashboardShell role="contractor">{children}</DashboardShell>
          <OfflineIndicator />
          <PushPrompt />
          <InstallPrompt />
          <CrispWidget />
        </EventProvider>
      </RoleProvider>
    </AuthGuard>
  )
}
