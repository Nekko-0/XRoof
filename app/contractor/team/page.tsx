"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRole } from "@/lib/role-context"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import {
  Users, UserPlus, Shield, Eye, Briefcase, Trash2, Mail,
  CheckCircle, Clock, Crown, RefreshCw, Check, X, ChevronDown,
  Clipboard, HardHat,
} from "lucide-react"

type TeamMember = {
  id: string
  account_id: string
  user_id: string | null
  invited_email: string
  invited_name: string
  role: string
  status: string
  created_at: string
}

const ROLES = [
  { value: "admin", label: "Admin", description: "Full access to everything", icon: Crown, color: "text-amber-600", bg: "bg-amber-500/10" },
  { value: "office_manager", label: "Office Manager", description: "All features except billing & team", icon: Clipboard, color: "text-purple-600", bg: "bg-purple-500/10" },
  { value: "sales", label: "Salesperson", description: "Own leads, estimates, contracts", icon: Briefcase, color: "text-blue-600", bg: "bg-blue-500/10" },
  { value: "field_tech", label: "Field Tech", description: "Field mode, work orders, measurements", icon: HardHat, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { value: "viewer", label: "Viewer", description: "Read-only access", icon: Eye, color: "text-gray-500", bg: "bg-gray-500/10" },
]

export default function TeamPage() {
  const { accountId, role: myRole, isOwner } = useRole()
  const toast = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState("sales")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState("")
  const [resending, setResending] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!accountId) return
    const fetchMembers = async () => {
      const res = await authFetch(`/api/team?account_id=${accountId}`)
      const data = await res.json()
      setMembers(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchMembers()
    // Fetch owner profile
    supabase.from("profiles").select("username, email").eq("id", accountId).single().then(({ data }) => {
      if (data) {
        setOwnerName(data.username || "Owner")
        setOwnerEmail(data.email || "")
      }
    })
    // Check subscription status
    supabase.from("subscriptions")
      .select("status")
      .eq("user_id", accountId)
      .in("status", ["active", "trialing", "past_due"])
      .in("plan", ["monthly", "annual"])
      .maybeSingle()
      .then(({ data }) => setHasSubscription(!!data))
  }, [accountId])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    // Show billing confirmation first
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setInviting(true)
    setInviteError("")
    setShowConfirm(false)

    const res = await authFetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        invited_email: inviteEmail.trim(),
        invited_name: inviteName.trim(),
        role: inviteRole,
      }),
    })

    const data = await res.json()
    if (data.error) {
      setInviteError(data.error)
    } else if (data.id) {
      setMembers((prev) => [data, ...prev])
      setInviteEmail("")
      setInviteName("")
      setInviteRole("sales")
      setShowInvite(false)
    }
    setInviting(false)
  }

  const handleResendInvite = async (memberId: string) => {
    setResending(memberId)
    try {
      const res = await authFetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_member_id: memberId }),
      })
      const data = await res.json()
      if (data.error) toast.error(data.error)
    } catch {
      toast.error("Failed to resend invite")
    }
    setResending(null)
  }

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this team member?")) return
    await authFetch(`/api/team?id=${id}`, { method: "DELETE" })
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    const res = await authFetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole }),
    })
    const data = await res.json()
    if (data.id) {
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m))
    }
  }

  // Non-admin shouldn't see this page (nav is hidden), but double-check
  if (myRole !== "admin") {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">You don't have permission to manage the team.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Team
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your team members and their permissions
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div key={r.value} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${r.bg}`}>
              <r.icon className={`h-4 w-4 ${r.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{r.label}</p>
              <p className="text-[11px] text-muted-foreground">{r.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">View Permission Details</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showPermissions ? "rotate-180" : ""}`} />
        </button>

        {showPermissions && (
          <div className="overflow-x-auto border-t border-border px-4 pb-4">
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr>
                  <th className="pb-3 pr-4 text-left text-xs font-semibold text-muted-foreground">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r.value} className="pb-3 text-center text-xs font-semibold">
                      <span className={r.color}>{r.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "View Dashboard", perms: [true, true, true, true, true] },
                  { label: "View All Leads", perms: [true, true, false, false, false] },
                  { label: "Manage Own Leads", perms: [true, true, true, false, false] },
                  { label: "Create & Send Estimates", perms: [true, true, true, false, false] },
                  { label: "Manage Contracts", perms: [true, true, false, false, false] },
                  { label: "Manage Invoices", perms: [true, true, false, false, false] },
                  { label: "View Analytics", perms: [true, true, true, false, false] },
                  { label: "Field Mode", perms: [true, true, false, true, false] },
                  { label: "Work Orders", perms: [true, true, false, true, true] },
                  { label: "Dispatch Board", perms: [true, true, false, false, false] },
                  { label: "Calendar", perms: [true, true, true, true, false] },
                  { label: "SMS & Messages", perms: [true, true, true, false, false] },
                  { label: "Automations", perms: [true, true, false, false, false] },
                  { label: "Manage Team", perms: [true, false, false, false, false] },
                  { label: "Billing & Settings", perms: [true, false, false, false, false] },
                ].map((perm, i) => (
                  <tr key={perm.label} className={i % 2 === 0 ? "bg-secondary/40" : ""}>
                    <td className="rounded-l-lg py-2.5 pl-3 pr-4 text-foreground font-medium">{perm.label}</td>
                    {perm.perms.map((allowed, j) => (
                      <td key={j} className={`py-2.5 text-center ${j === perm.perms.length - 1 ? "rounded-r-lg" : ""}`}>
                        {allowed ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <X className="mx-auto h-4 w-4 text-red-600" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <UserPlus className="h-4 w-4 text-primary" />
            Invite Team Member
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Smith"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@company.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {inviteRole === "admin" && (
            <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600">
                Admin has full control of your account — same access as you. Only 1 Admin seat allowed. Use for a trusted business partner only.
              </p>
            </div>
          )}

          {!hasSubscription && (
            <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600">
                Active subscription required to invite team members.{" "}
                <a href="/contractor/billing" className="underline hover:text-amber-300">Go to Billing</a>
              </p>
            </div>
          )}

          {inviteError && (
            <p className="mt-2 text-xs text-red-600">{inviteError}</p>
          )}

          {showConfirm && (
            <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium text-foreground">
                Adding a team member costs <span className="text-primary font-bold">$39/mo</span> (prorated to your billing cycle).
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Confirm & Send Invite" to proceed.</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting || !hasSubscription}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {inviting ? "Sending..." : showConfirm ? "Confirm & Send Invite" : "Send Invite"}
            </button>
            <button
              onClick={() => { setShowInvite(false); setShowConfirm(false) }}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Team Members ({members.length})
        </h3>

        {/* Owner row */}
        {ownerName && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-sm font-bold text-amber-600">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{ownerName}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {ownerEmail}
              </p>
            </div>
            <span className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 border border-amber-500/20">
              <Crown className="h-3 w-3 inline mr-1" />
              Owner
            </span>
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/40 p-8 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No team members yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Invite your team to collaborate on XRoof</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => {
              const roleConfig = ROLES.find((r) => r.value === m.role) || ROLES[2]
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
                  {/* Avatar */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${roleConfig.bg} text-sm font-bold ${roleConfig.color}`}>
                    {(m.invited_name || m.invited_email)[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {m.invited_name || m.invited_email}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{m.invited_email}</span>
                      <span>·</span>
                      {m.status === "invited" ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resend invite (only for pending) */}
                  {m.status === "invited" && (
                    <button
                      onClick={() => handleResendInvite(m.id)}
                      disabled={resending === m.id}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                      title="Resend invite email"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${resending === m.id ? "animate-spin" : ""}`} />
                    </button>
                  )}

                  {/* Role selector — owner only */}
                  {isOwner ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground">
                      {roleConfig.label}
                    </span>
                  )}

                  {/* Remove — owner only */}
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
