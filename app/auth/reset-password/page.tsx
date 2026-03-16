"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Home } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    // and sets the session. We just need to wait for it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })
    // Also check if session already exists (user may have landed with token already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setMessage("Please fill in both fields")
      return
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters")
      return
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    setLoading(true)
    setMessage("")

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
    } else {
      setMessage("Password updated! Redirecting to login...")
      await supabase.auth.signOut()
      setTimeout(() => router.push("/auth"), 2000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Home className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1
            className="mt-3 text-2xl font-bold text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            XRoof
          </h1>
          <h2
            className="mt-1 text-lg font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Set New Password
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {!ready ? (
            <p className="text-center text-sm text-muted-foreground">
              Verifying your reset link...
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <button
                onClick={handleReset}
                disabled={loading}
                className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Please wait..." : "Update Password"}
              </button>

              {message && (
                <p className="rounded-lg bg-secondary/50 px-3 py-2 text-center text-sm text-muted-foreground">
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
