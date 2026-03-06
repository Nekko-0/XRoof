"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Mail, Phone, MapPin, User, Pencil, Save, X, Wrench } from "lucide-react"

type Profile = {
  name: string
  address: string
  phone: string
  email: string
}

type PairedContractor = {
  username: string
  company_name: string
  job_type: string
  status: string
  profile_photo_url: string
}

export default function HomeownerProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [profile, setProfile] = useState<Profile>({
    name: "",
    address: "",
    phone: "",
    email: "",
  })
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [contractors, setContractors] = useState<PairedContractor[]>([])

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("username, address, phone, email")
        .eq("id", user.id)
        .single()

      if (error || !data) {
        setProfile({ name: "", address: "", phone: "", email: user.email || "" })
        setEditing(true)
        setIsNew(true)
      } else {
        setProfile({
          name: data.username || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
        })
      }

      // Fetch paired contractors
      const { data: jobs } = await supabase
        .from("jobs")
        .select("contractor_id, job_type, status")
        .eq("homeowner_id", user.id)
        .not("contractor_id", "is", null)

      if (jobs && jobs.length > 0) {
        const contractorIds = [...new Set(jobs.map((j: any) => j.contractor_id).filter(Boolean))]
        if (contractorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, company_name, profile_photo_url")
            .in("id", contractorIds)
          const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))
          setContractors(jobs.map((j: any) => ({
            username: profileMap[j.contractor_id]?.username || "Contractor",
            company_name: profileMap[j.contractor_id]?.company_name || "",
            profile_photo_url: profileMap[j.contractor_id]?.profile_photo_url || "",
            job_type: j.job_type,
            status: j.status,
          })))
        }
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .update({
        username: profile.name,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
      })
      .eq("id", user.id)

    if (error) {
      alert("Error saving profile: " + error.message)
    } else {
      alert("Profile updated successfully!")
      setEditing(false)
      setIsNew(false)
    }
  }

  if (loading) return <p className="p-6">Loading profile...</p>

  const initials = profile.name
    ? profile.name.slice(0, 2).toUpperCase()
    : "??"

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            My Profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNew ? "Set up your profile to get started." : "Manage your personal information."}
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            {!isNew && (
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Paired Contractors */}
      {contractors.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Your Contractors
          </h3>
          <div className="flex flex-col gap-2">
            {contractors.map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-4 py-2.5">
                {c.profile_photo_url ? (
                  <img src={c.profile_photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {c.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.username}</p>
                  <p className="text-xs text-muted-foreground">{c.company_name || c.job_type}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {profile.name || "No name set"}
            </h3>
            <p className="text-sm text-muted-foreground">Homeowner</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ProfileField
            icon={<User className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Full Name"
            value={profile.name}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, name: v })}
            placeholder="Your full name"
          />
          <ProfileField
            icon={<Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Email"
            value={profile.email}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, email: v })}
            placeholder="you@example.com"
          />
          <ProfileField
            icon={<MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Address"
            value={profile.address}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, address: v })}
            placeholder="Your home address"
          />
          <ProfileField
            icon={<Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Phone Number"
            value={profile.phone}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, phone: v })}
            placeholder="(555) 123-4567"
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
          <p className="text-sm text-foreground">{value || "Not set"}</p>
        )}
      </div>
    </div>
  )
}
