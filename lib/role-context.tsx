"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabaseClient"
import { hasPermission, type Role, type Permission } from "@/lib/permissions"

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

      // Check if user has a parent_account_id (team member)
      const { data: profile } = await supabase
        .from("profiles")
        .select("parent_account_id")
        .eq("id", uid)
        .single()

      if (profile?.parent_account_id) {
        // Team member — look up their role from team_members
        const { data: member } = await supabase
          .from("team_members")
          .select("role")
          .eq("user_id", uid)
          .eq("account_id", profile.parent_account_id)
          .single()

        const memberRole = (member?.role || "viewer") as string
        // Map granular roles to legacy role for backward compatibility
        const legacyRole: "admin" | "sales" | "viewer" =
          ["admin", "office_manager"].includes(memberRole) ? "admin" :
          ["sales"].includes(memberRole) ? "sales" :
          "viewer"
        const granular = memberRole as Role

        setRoleInfo({
          role: legacyRole,
          granularRole: granular,
          accountId: profile.parent_account_id,
          userId: uid,
          isOwner: false,
          loading: false,
          can: (p: Permission) => hasPermission(granular, p),
        })
      } else {
        // Account owner
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
