"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import Link from "next/link"
import { Home, ArrowLeft, Target, MessageSquare, BarChart3 } from "lucide-react"
import { Suspense } from "react"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get("ref")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [serviceZips, setServiceZips] = useState("")
  const [isSignUp, setIsSignUp] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  // If ref code in URL, show signup and display referral banner
  useEffect(() => {
    if (refCode) setIsSignUp(true)
  }, [refCode])

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage("Please fill in all fields")
      return
    }

    const parsedZips = serviceZips.split(",").map((s) => s.trim()).filter(Boolean)
    if (parsedZips.length === 0) {
      setMessage("Please enter at least one service area zip code")
      return
    }

    setLoading(true)
    setMessage("")

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split("@")[0],
          role: "Contractor",
          service_zips: parsedZips,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    // Fire ad conversion events
    const fireConversion = () => {
      if (typeof window === "undefined") return
      if ((window as any).gtag && process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL) {
        (window as any).gtag("event", "conversion", {
          send_to: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL,
        })
      }
      if ((window as any).fbq) {
        (window as any).fbq("track", "CompleteRegistration")
      }
    }

    if (data.session) {
      const profileUpdate: Record<string, any> = { service_zips: parsedZips }
      if (refCode) profileUpdate.referred_by = refCode
      await supabase.from("profiles").update(profileUpdate).eq("id", data.user!.id)
      fireConversion()
      router.push("/contractor/dashboard")
    } else if (data.user) {
      fireConversion()
      setMessage("Check your email for a confirmation link, then log in!")
      setLoading(false)
      setIsSignUp(false)
    } else {
      setMessage("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage("Please enter your email address")
      return
    }
    setLoading(true)
    setMessage("")
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl + "/auth/reset-password",
    })
    setLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Check your email for a password reset link!")
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Please fill in all fields")
      return
    }
    setLoading(true)
    setMessage("")

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      if (data.user.email?.toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase()) {
        router.push("/admin/dashboard")
        return
      }
      router.push("/contractor/dashboard")
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
            {forgotMode ? "Reset Password" : isSignUp ? "Join XRoof" : "Welcome Back"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {forgotMode ? "Enter your email to receive a reset link" : isSignUp ? "Sign up as a contractor to receive leads" : "Sign in to manage your leads"}
          </p>
        </div>

        {/* Referral banner */}
        {refCode && isSignUp && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-600">You&apos;ve been referred! Sign up and get $50 credit when you subscribe.</p>
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            {!forgotMode && isSignUp && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Service Area Zip Codes *</label>
                  <input
                    type="text"
                    placeholder="e.g. 62704, 62521, 61820"
                    value={serviceZips}
                    onChange={(e) => setServiceZips(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Separate multiple zip codes with commas</p>
                </div>
              </>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                placeholder="contractor@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {!forgotMode && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {!forgotMode && !isSignUp && (
              <button
                type="button"
                onClick={() => { setForgotMode(true); setMessage("") }}
                className="self-end text-xs font-medium text-primary hover:text-primary/80 -mt-2"
              >
                Forgot password?
              </button>
            )}

            <button
              onClick={forgotMode ? handleForgotPassword : isSignUp ? handleSignUp : handleLogin}
              disabled={loading}
              className="mt-1 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : forgotMode ? "Send Reset Link" : isSignUp ? "Sign Up" : "Login"}
            </button>

            {message && (
              <p className="rounded-lg bg-secondary/50 px-3 py-2 text-center text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-4 text-center">
            {forgotMode ? (
              <button
                onClick={() => { setForgotMode(false); setMessage("") }}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Back to login
              </button>
            ) : (
              <button
                onClick={() => { setIsSignUp(!isSignUp); setMessage("") }}
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign Up"}
              </button>
            )}
          </div>
        </div>

        {/* Why Join XRoof */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-base font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Why Join XRoof?
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Quality leads delivered directly to your dashboard</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Manage jobs and communicate with the admin team</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Track your completed work and grow your business</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AuthForm />
    </Suspense>
  )
}
