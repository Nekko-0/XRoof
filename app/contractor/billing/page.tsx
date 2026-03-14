"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  CreditCard, Check, Zap, Crown, LinkIcon, CheckCircle,
  Sparkles, Shield, BarChart3, Users, FileText, Ruler, MessageSquare,
  Calendar, Layers, Star,
} from "lucide-react"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"

type Subscription = {
  plan: string
  status: string
  current_period_end: string
} | null

type ConnectStatus = {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
} | null

export default function BillingPage() {
  const toast = useToast()
  const [sub, setSub] = useState<Subscription>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(null)
  const [connectingStripe, setConnectingStripe] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", session.user.id)
        .in("status", ["active", "past_due", "trialing"])
        .in("plan", ["monthly", "annual"])
        .maybeSingle()

      setSub(data || null)

      // Check Stripe Connect status
      try {
        const connectRes = await authFetch(`/api/stripe/connect?user_id=${session.user.id}`)
        const connectData = await connectRes.json()
        setConnectStatus(connectData)
      } catch {
        setConnectStatus({ connected: false })
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    if (!userId) return
    setCheckingOut(plan)
    try {
      const res = await authFetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || "Failed to create checkout session")
    } catch {
      toast.error("Error creating checkout")
    }
    setCheckingOut(null)
  }

  const handleConnectStripe = async () => {
    if (!userId) return
    setConnectingStripe(true)
    try {
      const res = await authFetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || "Failed to start Connect onboarding")
    } catch {
      toast.error("Error connecting Stripe")
    }
    setConnectingStripe(false)
  }

  const handleCancel = async () => {
    if (!userId) return
    setCanceling(true)
    try {
      const res = await authFetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Subscription canceled. You'll keep access until the end of your billing period.")
        setShowCancelConfirm(false)
        // Refresh sub status
        const { data: updated } = await supabase
          .from("subscriptions")
          .select("plan, status, current_period_end")
          .eq("user_id", userId)
          .in("status", ["active", "past_due", "trialing"])
          .in("plan", ["monthly", "annual"])
          .maybeSingle()
        setSub(updated || null)
      } else {
        toast.error(data.error || "Failed to cancel subscription")
      }
    } catch {
      toast.error("Error canceling subscription")
    }
    setCanceling(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const coreFeatures = [
    { icon: FileText, label: "Unlimited roof reports & proposals" },
    { icon: Ruler, label: "Satellite measurement tool" },
    { icon: FileText, label: "Contract builder & e-signing" },
    { icon: Layers, label: "Lead management & pipeline" },
    { icon: Sparkles, label: "Instant estimates with PDF export" },
    { icon: MessageSquare, label: "SMS & email automations" },
    { icon: BarChart3, label: "Analytics dashboard" },
    { icon: Calendar, label: "Calendar & customer booking" },
    { icon: CreditCard, label: "Stripe payment collection" },
    { icon: Shield, label: "Customer portal & landing pages" },
  ]

  const hasActiveSub = sub && (sub.status === "active" || sub.status === "trialing")

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <div className="text-center">
        <h2
          className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Everything you need to close more roofing jobs
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
          One platform. Reports, measurements, contracts, invoices, pipeline, team management, and more — all included.
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>Launch pricing — lock in your rate before prices go up</span>
        </div>
      </div>

      {hasActiveSub ? (
        /* ─── Active Subscription ─── */
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Active Subscription</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Plan: <span className="font-semibold capitalize text-foreground">{sub!.plan}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {sub!.plan === "annual" ? "$169/month (billed annually)" : sub!.plan === "solo" ? "$99/month" : "$199/month"}
              </p>
              {sub!.current_period_end && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next billing:{" "}
                  {new Date(sub!.current_period_end).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
            <span className="rounded-full bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              Active
            </span>
          </div>
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel Subscription
            </button>
          ) : (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="mb-3 text-sm text-foreground">
                Are you sure? You&apos;ll keep access until the end of your current billing period.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {canceling ? "Canceling..." : "Yes, Cancel"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Pricing Cards ─── */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Pro Monthly */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-foreground">Pro Monthly</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">For roofing contractors & companies</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">$199</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">7-day free trial. Cancel anytime.</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2.5">
              {coreFeatures.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  {f.label}
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <Users className="h-4 w-4 flex-shrink-0" />
                Team management (+$39/mo per member)
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe("monthly")}
              disabled={checkingOut === "monthly"}
              className="w-full rounded-xl border-2 border-primary bg-transparent px-4 py-3 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                {checkingOut === "monthly" ? "Redirecting..." : "Get Started"}
              </span>
            </button>
          </div>

          {/* Pro Annual — Recommended */}
          <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-lg shadow-primary/5">
            {/* Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-md">
                <Star className="h-3 w-3" />
                SAVE $360/yr
              </span>
            </div>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-foreground">Pro Annual</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Same features, 15% cheaper</p>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-foreground">$169</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">7-day free trial. Billed annually ($2,028/yr).</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2.5">
              {coreFeatures.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  {f.label}
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-sm font-semibold text-primary">
                <Users className="h-4 w-4 flex-shrink-0" />
                Team management (+$39/mo per member)
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe("annual")}
              disabled={checkingOut === "annual"}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                {checkingOut === "annual" ? "Redirecting..." : "Get Started — Best Value"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Payment Processing — Stripe Connect ─── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-1 text-base font-bold text-foreground">Payment Processing</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Connect your Stripe account to send invoices and collect payments from customers directly.
        </p>

        {connectStatus?.connected && connectStatus.charges_enabled ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-emerald-400">Payments Connected</p>
              <p className="text-xs text-muted-foreground">
                You can send invoices with payment links from My Leads. 1% platform fee + standard Stripe fees (2.9% + $0.30).
              </p>
            </div>
          </div>
        ) : connectStatus?.connected && !connectStatus.charges_enabled ? (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm text-amber-400">
                Stripe account connected but not fully set up. Complete onboarding to start accepting payments.
              </p>
            </div>
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <LinkIcon className="h-4 w-4" />
              {connectingStripe ? "Redirecting..." : "Complete Setup"}
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                Send professional invoices with a payment link
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                Customers pay with card — money goes to your bank
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                1% platform fee + standard Stripe fees (2.9% + $0.30)
              </div>
            </div>
            <button
              onClick={handleConnectStripe}
              disabled={connectingStripe}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <LinkIcon className="h-4 w-4" />
              {connectingStripe ? "Redirecting..." : "Connect Stripe"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
