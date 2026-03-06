"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Mail, Phone, MapPin, Pencil, Building2, Clock, FileText, Save, X } from "lucide-react"

type Profile = {
  company_name: string
  service_zips: string[]
  phone: string
  email: string
  years_experience: number | null
  about: string
}

export default function ContractorProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, service_zips, phone, email, years_experience, about")
        .eq("id", user.id)
        .single()

      if (error || !data) {
        // Profile doesn't exist or has no data — start in edit mode
        setProfile({
          company_name: "",
          service_zips: [],
          phone: "",
          email: user.email || "",
          years_experience: null,
          about: "",
        })
        setEditing(true)
        setIsNew(true)
      } else {
        setProfile({
          company_name: data.company_name || "",
          service_zips: data.service_zips || [],
          phone: data.phone || "",
          email: data.email || "",
          years_experience: data.years_experience ?? null,
          about: data.about || "",
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
        company_name: profile.company_name,
        service_zips: profile.service_zips,
        phone: profile.phone,
        email: profile.email,
        years_experience: profile.years_experience,
        about: profile.about,
      })
      .eq("id", user.id)

    if (error) {
      alert("Error saving profile: " + error.message)
    } else {
      alert("Profile updated successfully!")
      setEditing(false)
    }
  }

  if (loading) return <p className="p-6">Loading profile...</p>
  if (!profile) return <p className="p-6">Profile not found. Please log in again.</p>

  const initials = profile.company_name
    ? profile.company_name.slice(0, 2).toUpperCase()
    : "??"

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Company Profile
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your company information.
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
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
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

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {initials}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              {profile.company_name || "No company name set"}
            </h3>
            <p className="text-sm text-muted-foreground">Contractor</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ProfileField
            icon={<Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Company Name"
            value={profile.company_name}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, company_name: v })}
          />
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
          <ProfileField
            icon={<Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Years Experience"
            value={profile.years_experience?.toString() || ""}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, years_experience: v ? Number(v) : null })}
            suffix={!editing ? " years" : undefined}
          />
          <div className="flex items-start gap-3 rounded-lg bg-secondary/30 px-4 py-3">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground">About Company</p>
              {editing ? (
                <textarea
                  value={profile.about}
                  onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="text-sm leading-relaxed text-foreground">
                  {profile.about || "No description set"}
                </p>
              )}
            </div>
          </div>
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
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: string
  editing: boolean
  onChange: (v: string) => void
  placeholder?: string
  suffix?: string
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
            {value || "Not set"}{suffix && value ? suffix : ""}
          </p>
        )}
      </div>
    </div>
  )
}
