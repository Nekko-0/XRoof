"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Mail, Phone, MapPin, Pencil, Save, X, Briefcase, CheckCircle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

type Profile = {
  service_zips: string[]
  phone: string
  email: string
}

export default function ContractorProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState(0)
  const [completedJobs, setCompletedJobs] = useState(0)
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("service_zips, phone, email")
        .eq("id", user.id)
        .single()

      setUserName(user.user_metadata?.username || user.email?.split("@")[0] || "Contractor")

      // Fetch job counts
      const { count: active } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .in("status", ["Assigned", "Accepted"])
      setActiveJobs(active || 0)

      const { count: completed } = await supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("contractor_id", user.id)
        .eq("status", "Completed")
      setCompletedJobs(completed || 0)

      if (error || !data) {
        setProfile({
          service_zips: [],
          phone: "",
          email: user.email || "",
        })
        setEditing(true)
      } else {
        setProfile({
          service_zips: data.service_zips || [],
          phone: data.phone || "",
          email: data.email || "",
        })
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({
        service_zips: profile.service_zips,
        phone: profile.phone,
        email: profile.email,
      })
      .eq("id", user.id)

    if (error) {
      alert("Error saving profile: " + error.message)
    } else {
      alert("Profile updated successfully!")
      setEditing(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <p className="p-6">Loading profile...</p>
  if (!profile) return <p className="p-6">Profile not found. Please log in again.</p>

  const initials = userName.slice(0, 2).toUpperCase()

  const profileStats = [
    { label: "Active Leads", value: activeJobs, icon: Briefcase, color: "bg-green-50 text-green-700" },
    { label: "Completed", value: completedJobs, icon: CheckCircle, color: "bg-blue-50 text-blue-700" },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      {/* Profile header with avatar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              {userName}
            </h2>
            <p className="text-xs text-muted-foreground">Contractor</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {profileStats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Edit/Save buttons */}
      <div className="mb-4 flex justify-end">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Profile fields */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <ProfileField
            icon={<MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Service Area Zip Codes"
            value={profile.service_zips.join(", ")}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, service_zips: v.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="e.g. 62704, 62521, 61820"
          />
          <ProfileField
            icon={<Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Phone Number"
            value={profile.phone}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, phone: v })}
          />
          <ProfileField
            icon={<Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Email"
            value={profile.email}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, email: v })}
          />
        </div>
      </div>
    </div>
  )
}

function ProfileField({
  icon,
  label,
  value,
  editing,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
      {icon}
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {editing ? (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <p className="text-sm text-foreground">
            {value || "Not set"}
          </p>
        )}
      </div>
    </div>
  )
}
