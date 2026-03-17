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

    // Once Crisp loads, set user identity from Supabase session
    s.onload = async () => {
      try {
        const { supabase } = await import("@/lib/supabaseClient")
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const email = session.user.email
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, company_name")
          .eq("id", session.user.id)
          .single()

        const $crisp = (window as any).$crisp
        if (email) $crisp.push(["set", "user:email", [email]])
        if (profile?.full_name) $crisp.push(["set", "user:nickname", [profile.full_name]])
        if (profile?.company_name) {
          $crisp.push(["set", "session:data", [[["company", profile.company_name]]]])
        }
      } catch {}
    }

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
