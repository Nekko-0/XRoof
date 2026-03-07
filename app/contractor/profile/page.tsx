"use client"

import { useEffect, useState, useRef } from "react"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { Mail, Phone, MapPin, Pencil, Building2, Clock, FileText, Save, X, Shield, ShieldCheck, Camera, ImagePlus } from "lucide-react"

type Profile = {
  company_name: string
  service_zips: string[]
  phone: string
  email: string
  years_experience: number | null
  about: string
  license_number: string
  insurance_info: string
  profile_photo_url: string
  portfolio_urls: string[]
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
  const [uploading, setUploading] = useState(false)
  const [portfolioUploading, setPortfolioUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, service_zips, phone, email, years_experience, about, license_number, insurance_info, profile_photo_url, portfolio_urls")
        .eq("id", user.id)
        .single()

      if (error || !data) {
        setProfile({
          company_name: "",
          service_zips: [],
          phone: "",
          email: user.email || "",
          years_experience: null,
          about: "",
          license_number: "",
          insurance_info: "",
          profile_photo_url: "",
          portfolio_urls: [],
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
          license_number: data.license_number || "",
          insurance_info: data.insurance_info || "",
          profile_photo_url: data.profile_photo_url || "",
          portfolio_urls: data.portfolio_urls || [],
        })
      }

      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUploading(true)
    const ext = file.name.split(".").pop()
    const path = `${user.id}/profile.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      alert("Error uploading photo: " + uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(path)

    const photoUrl = urlData.publicUrl + "?t=" + Date.now()

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ profile_photo_url: photoUrl })
      .eq("id", user.id)

    if (updateError) {
      alert("Error saving photo: " + updateError.message)
    } else {
      setProfile({ ...profile, profile_photo_url: photoUrl })
    }
    setUploading(false)
  }

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!profile) return
    if (profile.portfolio_urls.length + files.length > 10) {
      alert("Maximum 10 portfolio photos allowed")
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setPortfolioUploading(true)
    const newUrls: string[] = []

    for (const file of files) {
      const ext = file.name.split(".").pop()
      const path = `${user.id}/portfolio-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from("job-photos")
        .upload(path, file)
      if (error) {
        alert("Error uploading: " + error.message)
        continue
      }
      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(path)
      newUrls.push(urlData.publicUrl)
    }

    const updatedUrls = [...profile.portfolio_urls, ...newUrls]
    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_urls: updatedUrls })
      .eq("id", user.id)

    if (!error) {
      setProfile({ ...profile, portfolio_urls: updatedUrls })
    }
    setPortfolioUploading(false)
  }

  const removePortfolioPhoto = async (index: number) => {
    if (!profile) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const updatedUrls = profile.portfolio_urls.filter((_, i) => i !== index)
    const { error } = await supabase
      .from("profiles")
      .update({ portfolio_urls: updatedUrls })
      .eq("id", user.id)

    if (!error) {
      setProfile({ ...profile, portfolio_urls: updatedUrls })
    }
  }

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
        license_number: profile.license_number,
        insurance_info: profile.insurance_info,
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
          <div className="relative">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {initials}
              </div>
            )}
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
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
            icon={<Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="License Number"
            value={profile.license_number}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, license_number: v })}
            placeholder="e.g. ROO-12345"
          />
          <ProfileField
            icon={<ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />}
            label="Insurance Info"
            value={profile.insurance_info}
            editing={editing}
            onChange={(v) => setProfile({ ...profile, insurance_info: v })}
            placeholder="e.g. State Farm Policy #ABC123"
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

      {/* Work Portfolio */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <ImagePlus className="h-4 w-4" />
            Work Portfolio
          </h3>
          <span className="text-xs text-muted-foreground">{profile.portfolio_urls.length}/10 photos</span>
        </div>
        <input ref={portfolioInputRef} type="file" accept="image/*" multiple onChange={handlePortfolioUpload} className="hidden" />
        <div className="flex flex-wrap gap-3">
          {profile.portfolio_urls.map((url, i) => (
            <div key={i} className="relative h-24 w-24 rounded-lg overflow-hidden border border-border">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={`Work ${i + 1}`} className="h-full w-full object-cover hover:opacity-80 transition-opacity" />
              </a>
              <button
                type="button"
                onClick={() => removePortfolioPhoto(i)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {profile.portfolio_urls.length < 10 && (
            <button
              type="button"
              onClick={() => portfolioInputRef.current?.click()}
              disabled={portfolioUploading}
              className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <ImagePlus className="h-6 w-6" />
            </button>
          )}
        </div>
        {portfolioUploading && <p className="mt-2 text-xs text-muted-foreground">Uploading...</p>}
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
