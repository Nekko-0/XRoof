"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import { hasPermission, type Role, type Permission } from "@/lib/permissions"
import { authFetch } from "@/lib/auth-fetch"

type RoleInfo = {
  role: "admin" | "sales" | "viewer"
  granularRole: Role   // Full role including office_manager, field_tech
  accountId: string   // The contractor owner's ID (used for all data queries)
  userId: string      // The logged-in user's own ID
  isOwner: boolean    // true if this user is the account owner
  loading: boolean
  can: (permission: Permission) => boolean
}

const RoleContext = createContext<RoleInfo>({
  role: "admin",
  granularRole: "owner",
  accountId: "",
  userId: "",
  isOwner: true,
  loading: true,
  can: () => true,
})

export function useRole() {
  return useContext(RoleContext)
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [roleInfo, setRoleInfo] = useState<RoleInfo>({
    role: "admin",
    granularRole: "owner",
    accountId: "",
    userId: "",
    isOwner: true,
    loading: true,
    can: () => true,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const uid = session.user.id

      // Fetch role from server-side API (bypasses RLS)
      try {
        const res = await authFetch("/api/team/my-role")
        const data = await res.json()

        if (data.isOwner) {
          setRoleInfo({
            role: "admin",
            granularRole: "owner",
            accountId: data.accountId || uid,
            userId: uid,
            isOwner: true,
            loading: false,
            can: () => true,
          })
        } else {
          const memberRole = (data.role || "viewer") as string
          const legacyRole: "admin" | "sales" | "viewer" =
            ["admin", "office_manager"].includes(memberRole) ? "admin" :
            ["sales"].includes(memberRole) ? "sales" :
            "viewer"
          const granular = memberRole as Role

          setRoleInfo({
            role: legacyRole,
            granularRole: granular,
            accountId: data.accountId || uid,
            userId: uid,
            isOwner: false,
            loading: false,
            can: (p: Permission) => hasPermission(granular, p),
          })
        }
      } catch {
        // Fallback: treat as owner if API fails
        setRoleInfo({
          role: "admin",
          granularRole: "owner",
          accountId: uid,
          userId: uid,
          isOwner: true,
          loading: false,
          can: () => true,
        })
      }
    }

    init()
  }, [])

  return (
    <RoleContext.Provider value={roleInfo}>
      {children}
    </RoleContext.Provider>
  )
}
