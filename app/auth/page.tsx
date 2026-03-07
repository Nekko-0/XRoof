"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { Wrench, ArrowLeft } from "lucide-react"
import { Suspense } from "react"

function AuthForm() {
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isSignUp, setIsSignUp] = useState(true)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage("Please fill in all fields")
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
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push("/contractor/dashboard")
    } else if (data.user) {
      setMessage("Check your email for a confirmation link, then log in!")
      setLoading(false)
      setIsSignUp(false)
    } else {
      setMessage("Something went wrong. Please try again.")
      setLoading(false)
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
      if (data.user.email?.toLowerCase() === "contact@leons-roofing.com") {
        router.push("/admin/dashboard")
        return
      }
      router.push("/contractor/dashboard")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className="mt-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Wrench className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1
            className="mt-4 text-2xl font-bold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {isSignUp ? "Join XRoof" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? "Sign up as a contractor to receive leads" : "Log in to your contractor account"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={isSignUp ? handleSignUp : handleLogin}
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
            </button>

            {message && (
              <p className="rounded-lg bg-secondary/50 px-3 py-2 text-center text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage("") }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignUp ? "Already have an account? Log in" : "Don't have an account? Sign up"}
            </button>
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
