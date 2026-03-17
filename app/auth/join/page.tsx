"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Home, CheckCircle, AlertCircle } from "lucide-react"

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "done">("loading")
  const [invite, setInvite] = useState<any>(null)
  const [companyName, setCompanyName] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }

    const verify = async () => {
      // Call API to verify token (uses service role key)
      const res = await fetch(`/api/team/verify?token=${token}`)
      const data = await res.json()

      if (data.error || !data.invite) {
        setStatus("invalid")
        return
      }

      setInvite(data.invite)
      setCompanyName(data.company_name || "")
      setName(data.invite.invited_name || "")
      setStatus("valid")
    }

    verify()
  }, [token])

  const handleJoin = async () => {
    if (!password || password.length < 6) {
      setMessage("Password must be at least 6 characters")
      return
    }
    setSubmitting(true)
    setMessage("")

    // 1. Sign up with the invited email
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: invite.invited_email,
      password,
      options: {
        data: {
          username: name || invite.invited_email.split("@")[0],
          role: "team_member",
        },
      },
    })

    if (signUpErr) {
      // If user already exists, try to sign in instead
      if (signUpErr.message.includes("already registered")) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: invite.invited_email,
          password,
        })
        if (signInErr) {
          setMessage("This email is already registered. Please sign in with your existing password.")
          setSubmitting(false)
          return
        }
        // Activate via API
        const activateRes = await fetch("/api/team/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, user_id: signInData.user!.id, name }),
        })
        const activateData = await activateRes.json()
        if (activateData.error) {
          setMessage(activateData.error)
          setSubmitting(false)
          return
        }
        setStatus("done")
        setTimeout(() => router.push("/contractor/dashboard"), 1500)
        return
      }
      setMessage(signUpErr.message)
      setSubmitting(false)
      return
    }

    if (!signUpData.user) {
      setMessage("Something went wrong. Please try again.")
      setSubmitting(false)
      return
    }

    // 2. Activate the team member (sets user_id, parent_account_id, etc.)
    const activateRes = await fetch("/api/team/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: signUpData.user.id, name }),
    })
    const activateData = await activateRes.json()

    if (activateData.error) {
      setMessage(activateData.error)
      setSubmitting(false)
      return
    }

    // If session is available (no email confirmation required), redirect
    if (signUpData.session) {
      setStatus("done")
      setTimeout(() => router.push("/contractor/dashboard"), 1500)
    } else {
      setMessage("Check your email for a confirmation link, then log in!")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Home className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold text-primary" style={{ fontFamily: "var(--font-heading)" }}>
            XRoof
          </h1>
        </div>

        {status === "loading" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-sm text-muted-foreground">Verifying your invite...</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-600 mb-3" />
            <h2 className="text-lg font-bold text-foreground">Invalid Invite Link</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This invite link is invalid or has already been used. Please ask your team admin to send a new invite.
            </p>
          </div>
        )}

        {status === "valid" && invite && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                Join {companyName || "the team"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You&apos;ve been invited as <strong className="text-foreground capitalize">{invite.role}</strong>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{invite.invited_email}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Create Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                onClick={handleJoin}
                disabled={submitting || !password}
                className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Creating account..." : "Join Team"}
              </button>

              {message && (
                <p className="rounded-lg bg-secondary/50 px-3 py-2 text-center text-sm text-muted-foreground">
                  {message}
                </p>
              )}
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-emerald-600 mb-3" />
            <h2 className="text-lg font-bold text-foreground">Welcome aboard!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <JoinForm />
    </Suspense>
  )
}
