"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useToast } from "@/lib/toast-context"
import { authFetch } from "@/lib/auth-fetch"
import {
  Zap, Plus, Trash2, Clock, Mail, Phone, Bell, BellRing,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Save,
  CheckCircle, AlertCircle, Loader2, Filter, Send,
} from "lucide-react"

type StepCondition = {
  field: string
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than"
  value: string
}

type Step = {
  day: number
  type: "email" | "sms" | "reminder" | "notification"
  subject: string
  message: string
  condition?: StepCondition | null
}

type FollowupTemplate = {
  id: string
  name: string
  trigger: string
  steps: Step[]
  active: boolean
  created_at: string
}

type TemplateStats = Record<string, { pending: number; sent: number; failed: number }>

const TRIGGERS = [
  { value: "estimate_sent", label: "Estimate Sent", description: "When a proposal is sent to the customer" },
  { value: "job_completed", label: "Job Completed", description: "When a job is marked as completed" },
  { value: "new_lead", label: "New Lead", description: "When a new lead is created" },
  { value: "contract_signed", label: "Contract Signed", description: "When a customer signs a contract" },
  { value: "payment_received", label: "Payment Received", description: "When a payment is received" },
  { value: "estimate_viewed", label: "Estimate Viewed", description: "When a customer opens your estimate" },
  { value: "invoice_overdue", label: "Invoice Overdue", description: "When an invoice is unpaid for 14+ days" },
  { value: "appointment_reminder", label: "Appointment Reminder", description: "Day before a scheduled appointment" },
]

const STEP_TYPES = [
  { value: "email", label: "Email", icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10" },
  { value: "sms", label: "SMS", icon: Phone, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { value: "reminder", label: "Reminder", icon: Bell, color: "text-amber-400", bg: "bg-amber-500/10" },
  { value: "notification", label: "Notification", icon: BellRing, color: "text-purple-400", bg: "bg-purple-500/10" },
]

const DEFAULT_STEPS: Step[] = [
  { day: 1, type: "email", subject: "Thank you for your time", message: "Thank you for allowing us to provide an estimate for your roofing project. Please don't hesitate to reach out with any questions." },
  { day: 3, type: "sms", subject: "", message: "Hi {customer_name}, just following up on the estimate we sent for {address}. Happy to answer any questions!" },
  { day: 7, type: "reminder", subject: "", message: "It's been a week since the estimate was sent to {customer_name}. Consider giving them a call." },
]

const PLACEHOLDERS = ["{customer_name}", "{address}", "{company_name}", "{phone}", "{estimate_link}", "{contract_link}", "{invoice_link}", "{portal_link}"]

const TRIGGER_PLACEHOLDERS: Record<string, string[]> = {
  new_lead: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{portal_link}"],
  estimate_sent: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{estimate_link}", "{portal_link}"],
  estimate_viewed: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{estimate_link}", "{portal_link}"],
  contract_signed: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{estimate_link}", "{contract_link}", "{portal_link}"],
  payment_received: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{estimate_link}", "{contract_link}", "{invoice_link}", "{portal_link}"],
  job_completed: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{portal_link}"],
  invoice_overdue: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{invoice_link}", "{portal_link}"],
  appointment_reminder: ["{customer_name}", "{address}", "{company_name}", "{phone}", "{portal_link}"],
}

const PRESET_TEMPLATES = [
  {
    name: "New Lead Nurture",
    trigger: "new_lead",
    steps: [
      { day: 0, type: "email" as const, subject: "Thank you for reaching out!", message: "Hi {customer_name}, thank you for requesting a roofing estimate for {address}. We'll review your project and get back to you shortly. Feel free to reply with any questions!" },
      { day: 1, type: "sms" as const, subject: "", message: "Hi {customer_name}, this is {company_name}. We received your roofing request for {address} and will have an estimate ready soon!" },
      { day: 3, type: "email" as const, subject: "Update on your roofing project", message: "Hi {customer_name}, just checking in on your roofing project at {address}. We're working on your estimate and will have it ready soon. Feel free to reach out with any questions!" },
      { day: 7, type: "reminder" as const, subject: "", message: "Follow up with {customer_name} about estimate for {address} — no response yet after 7 days." },
      { day: 14, type: "email" as const, subject: "Still interested in your roofing project?", message: "Hi {customer_name}, just checking in about the estimate we sent for {address}. We'd love to help — feel free to reach out with any questions!" },
    ],
  },
  {
    name: "Post-Estimate Follow-up",
    trigger: "estimate_sent",
    steps: [
      { day: 1, type: "sms" as const, subject: "", message: "Hi {customer_name}! Your roofing estimate for {address} was just sent. Check your email for the details — happy to answer any questions!" },
      { day: 3, type: "email" as const, subject: "Any questions about your estimate?", message: "Hi {customer_name}, I wanted to follow up on the estimate we sent for {address}. Do you have any questions I can help with?" },
      { day: 7, type: "reminder" as const, subject: "", message: "7 days since estimate sent to {customer_name} for {address}. Consider a personal call." },
    ],
  },
  {
    name: "Review Request Sequence",
    trigger: "job_completed",
    steps: [
      { day: 1, type: "email" as const, subject: "How was your experience with {company_name}?", message: "Hi {customer_name}, congratulations on your new roof at {address}! We'd love to hear about your experience. A quick Google review would mean the world to us." },
      { day: 5, type: "sms" as const, subject: "", message: "Hi {customer_name}! We hope you're enjoying your new roof. If you have a moment, we'd appreciate a quick Google review. Thank you!" },
    ],
  },
  {
    name: "Payment Follow-up",
    trigger: "invoice_overdue",
    steps: [
      { day: 0, type: "email" as const, subject: "Friendly reminder: Invoice pending", message: "Hi {customer_name}, this is a friendly reminder that your invoice for {address} is now overdue. You can pay online here: {invoice_link}. Please let us know if you have any questions." },
      { day: 3, type: "sms" as const, subject: "", message: "Hi {customer_name}, gentle reminder that your roofing invoice is pending. Pay online: {invoice_link}" },
      { day: 7, type: "reminder" as const, subject: "", message: "Invoice for {customer_name} at {address} is 7+ days overdue. Consider a phone call." },
    ],
  },
]

const CONDITION_FIELDS = [
  { value: "job_type", label: "Job Type" },
  { value: "budget", label: "Budget" },
  { value: "status", label: "Job Status" },
  { value: "source", label: "Lead Source" },
  { value: "zip_code", label: "Zip Code" },
]

const CONDITION_OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
]

function StepTimeline({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null
  const sorted = [...steps].sort((a, b) => a.day - b.day)

  return (
    <div className="rounded-xl border border-border/50 bg-background/50 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timeline Preview</p>
      <div className="relative flex items-start">
        {/* Connector line */}
        {sorted.length > 1 && (
          <div
            className="absolute top-4 h-0.5 bg-border"
            style={{
              left: `${100 / (sorted.length * 2)}%`,
              right: `${100 / (sorted.length * 2)}%`,
            }}
          />
        )}
        {sorted.map((step, i) => {
          const config = STEP_TYPES.find((t) => t.value === step.type) || STEP_TYPES[0]
          const Icon = config.icon
          return (
            <div key={i} className="relative flex flex-1 flex-col items-center text-center">
              <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border ${config.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <span className="mt-1.5 text-[11px] font-bold text-foreground">Day {step.day}</span>
              <span className={`text-[10px] font-semibold ${config.color}`}>{config.label}</span>
              {(step.subject || step.message) && (
                <p className="mt-0.5 max-w-[120px] text-[10px] text-muted-foreground line-clamp-2">
                  {step.subject || step.message}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AutomationsPage() {
  const [userId, setUserId] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [templates, setTemplates] = useState<FollowupTemplate[]>([])
  const [stats, setStats] = useState<TemplateStats>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [newName, setNewName] = useState("")
  const [newTrigger, setNewTrigger] = useState("estimate_sent")
  const [newSteps, setNewSteps] = useState<Step[]>([...DEFAULT_STEPS])
  const [saving, setSaving] = useState(false)

  // Test send
  const [testingStep, setTestingStep] = useState<string | null>(null) // "create-0", "template-{id}-1", etc.
  const [smsPreview, setSmsPreview] = useState<{ key: string; message: string } | null>(null)
  const toast = useToast()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      setUserId(session.user.id)
      setUserEmail(session.user.email || "")

      const [templatesRes, statsRes] = await Promise.all([
        authFetch(`/api/automations?contractor_id=${session.user.id}`),
        authFetch(`/api/automations/stats?contractor_id=${session.user.id}`),
      ])
      const templatesData = await templatesRes.json()
      const statsData = await statsRes.json()
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      setStats(statsData || {})
      setLoading(false)
    }
    init()
  }, [])

  const handleCreate = async () => {
    if (!newName.trim() || newSteps.length === 0) return
    setSaving(true)

    const res = await authFetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: userId,
        name: newName.trim(),
        trigger: newTrigger,
        steps: newSteps,
      }),
    })

    const data = await res.json()
    if (data.id) {
      setTemplates((prev) => [data, ...prev])
      setNewName("")
      setNewSteps([...DEFAULT_STEPS])
      setShowCreate(false)
    }
    setSaving(false)
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const res = await authFetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !currentActive }),
    })
    const data = await res.json()
    if (data.id) {
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, active: !currentActive } : t))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this automation?")) return
    await authFetch(`/api/automations?id=${id}`, { method: "DELETE" })
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const updateStep = (index: number, field: keyof Step, value: string | number) => {
    setNewSteps((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const addStep = () => {
    const lastDay = newSteps.length > 0 ? newSteps[newSteps.length - 1].day + 3 : 1
    setNewSteps((prev) => [...prev, { day: lastDay, type: "email", subject: "", message: "" }])
  }

  const removeStep = (index: number) => {
    setNewSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTestStep = async (step: Step, stepKey: string) => {
    if (step.type === "reminder") return
    setTestingStep(stepKey)
    setSmsPreview(null)
    try {
      const res = await authFetch("/api/automations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: step.type,
          subject: step.subject || "",
          body: step.message,
          recipient: userEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Test failed")
      } else if (step.type === "email") {
        toast.success(`Test email sent to ${userEmail}`)
      } else if (step.type === "sms" && data.rendered_message) {
        setSmsPreview({ key: stepKey, message: data.rendered_message })
        toast.info("SMS preview rendered with sample data")
      }
    } catch {
      toast.error("Failed to send test")
    } finally {
      setTestingStep(null)
    }
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
            Automations
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up automatic follow-up sequences for your leads
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Automation
        </button>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">How it works</p>
            <p className="text-xs text-muted-foreground">
              Create a sequence of follow-ups. When the trigger event occurs, the system automatically sends emails, SMS, or creates reminders on the scheduled days.
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-200/80">
          <strong className="text-amber-300">Tip:</strong> Automations are triggered by events (estimate sent, contract signed, etc.). Each trigger only shows placeholders guaranteed to exist at that point — so your emails never have broken links. Use our ready-made templates or build your own.
        </p>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <Plus className="h-4 w-4 text-primary" />
            Create Automation
          </h3>

          {/* Quick Start Presets */}
          {newName === "" && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Quick Start — use a preset template:</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRESET_TEMPLATES.map((preset) => {
                  const trigger = TRIGGERS.find((t) => t.value === preset.trigger)
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setNewName(preset.name)
                        setNewTrigger(preset.trigger)
                        setNewSteps(preset.steps.map((s) => ({ ...s })))
                      }}
                      className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-semibold text-foreground">{preset.name}</p>
                        <p className="text-[10px] text-muted-foreground">{trigger?.label} • {preset.steps.length} steps</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-2 text-[10px] text-muted-foreground">or create from scratch</span></div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Automation Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Estimate Follow-up"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Trigger Event</label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Placeholders hint */}
          <div className="mt-3 rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">
              Available placeholders: {(TRIGGER_PLACEHOLDERS[newTrigger] || PLACEHOLDERS).map((p) => (
                <code key={p} className="mx-0.5 rounded bg-secondary px-1 py-0.5 text-[10px] font-bold text-foreground">{p}</code>
              ))}
            </p>
          </div>

          {/* Steps */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Follow-up Steps</label>
            <div className="flex flex-col gap-3">
              {newSteps.map((step, i) => {
                const stepType = STEP_TYPES.find((t) => t.value === step.type) || STEP_TYPES[0]
                const StepIcon = stepType.icon
                return (
                  <div key={i} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`flex items-center gap-1.5 rounded-lg ${stepType.bg} px-2.5 py-1`}>
                        <StepIcon className={`h-3 w-3 ${stepType.color}`} />
                        <span className="text-[11px] font-bold text-foreground">Day</span>
                        <input
                          type="number"
                          value={step.day}
                          onChange={(e) => updateStep(i, "day", Number(e.target.value))}
                          className="w-10 bg-transparent text-center text-[11px] font-bold text-foreground outline-none"
                          min={0}
                        />
                      </div>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, "type", e.target.value)}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold text-foreground"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <div className="flex-1" />
                      {step.type !== "reminder" && step.type !== "notification" && (
                        <button
                          onClick={() => handleTestStep(step, `create-${i}`)}
                          disabled={testingStep === `create-${i}` || !step.message.trim()}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
                          title={step.type === "email" ? `Send test to ${userEmail}` : "Preview with sample data"}
                        >
                          {testingStep === `create-${i}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Test
                        </button>
                      )}
                      <button
                        onClick={() => removeStep(i)}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {step.type === "email" && (
                      <input
                        value={step.subject}
                        onChange={(e) => updateStep(i, "subject", e.target.value)}
                        placeholder="Email subject line"
                        className="mb-1 w-full rounded-lg border border-border/50 bg-transparent px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
                      />
                    )}
                    <textarea
                      value={step.message}
                      onChange={(e) => updateStep(i, "message", e.target.value)}
                      placeholder={
                        step.type === "email" ? "Email body..."
                        : step.type === "sms" ? "SMS message (keep under 160 chars)..."
                        : "Reminder note for yourself..."
                      }
                      rows={2}
                      className="w-full rounded-lg border border-border/50 bg-transparent px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 resize-none"
                    />
                    {/* Condition builder */}
                    {step.condition ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2">
                        <Filter className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-400">Only if</span>
                        <select
                          value={step.condition.field}
                          onChange={(e) => {
                            const updated = [...newSteps]
                            updated[i] = { ...step, condition: { ...step.condition!, field: e.target.value } }
                            setNewSteps(updated)
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
                        >
                          {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select
                          value={step.condition.operator}
                          onChange={(e) => {
                            const updated = [...newSteps]
                            updated[i] = { ...step, condition: { ...step.condition!, operator: e.target.value as StepCondition["operator"] } }
                            setNewSteps(updated)
                          }}
                          className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground"
                        >
                          {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <input
                          value={step.condition.value}
                          onChange={(e) => {
                            const updated = [...newSteps]
                            updated[i] = { ...step, condition: { ...step.condition!, value: e.target.value } }
                            setNewSteps(updated)
                          }}
                          placeholder="value"
                          className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground outline-none"
                        />
                        <button
                          onClick={() => {
                            const updated = [...newSteps]
                            updated[i] = { ...step, condition: null }
                            setNewSteps(updated)
                          }}
                          className="ml-auto rounded p-0.5 text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const updated = [...newSteps]
                          updated[i] = { ...step, condition: { field: "job_type", operator: "equals", value: "" } }
                          setNewSteps(updated)
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-amber-400 transition-colors"
                      >
                        <Filter className="h-3 w-3" /> Add condition
                      </button>
                    )}
                    {smsPreview?.key === `create-${i}` && (
                      <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">SMS Preview</p>
                        <p className="text-xs text-foreground">{smsPreview.message}</p>
                        <button
                          onClick={() => setSmsPreview(null)}
                          className="mt-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button
              onClick={addStep}
              className="mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Add Step
            </button>
          </div>

          {/* Live Timeline Preview */}
          {newSteps.length > 0 && (
            <div className="mt-4">
              <StepTimeline steps={newSteps} />
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || newSteps.length === 0 || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Automation"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Automations */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Your Automations ({templates.length})</h3>

        {templates.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/40 p-8 text-center">
            <Zap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No automations yet</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Create your first follow-up sequence to automate outreach</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Create Automation
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((t) => {
              const trigger = TRIGGERS.find((tr) => tr.value === t.trigger)
              const isExpanded = expandedId === t.id
              const s = stats[t.id]
              return (
                <div key={t.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : t.id)}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(t.id, t.active) }}
                      className="flex-shrink-0"
                      title={t.active ? "Active — click to pause" : "Paused — click to activate"}
                    >
                      {t.active ? (
                        <ToggleRight className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${t.active ? "text-foreground" : "text-muted-foreground"}`}>
                        {t.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Trigger: {trigger?.label || t.trigger}</span>
                        <span>·</span>
                        <span>{t.steps?.length || 0} steps</span>
                        {s && (s.sent > 0 || s.pending > 0 || s.failed > 0) && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              {s.sent > 0 && (
                                <span className="flex items-center gap-0.5 text-emerald-400">
                                  <CheckCircle className="h-3 w-3" /> {s.sent}
                                </span>
                              )}
                              {s.pending > 0 && (
                                <span className="flex items-center gap-0.5 text-blue-400">
                                  <Loader2 className="h-3 w-3" /> {s.pending}
                                </span>
                              )}
                              {s.failed > 0 && (
                                <span className="flex items-center gap-0.5 text-red-400">
                                  <AlertCircle className="h-3 w-3" /> {s.failed}
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>

                  {isExpanded && t.steps && (
                    <div className="border-t border-border bg-background/50 px-4 py-3 space-y-3">
                      {/* Timeline */}
                      <StepTimeline steps={t.steps} />

                      {/* Step details */}
                      <div className="relative ml-3 border-l-2 border-border/50 pl-4">
                        {t.steps.map((step: Step, i: number) => {
                          const stepType = STEP_TYPES.find((st) => st.value === step.type) || STEP_TYPES[0]
                          const StepIcon = stepType.icon
                          return (
                            <div key={i} className="relative mb-3 last:mb-0">
                              <span className={`absolute -left-[23px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border ${stepType.bg}`}>
                                <StepIcon className={`h-3 w-3 ${stepType.color}`} />
                              </span>
                              <div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  <span className="rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground">Day {step.day}</span>
                                  <span className={`font-semibold capitalize ${stepType.color}`}>{step.type}</span>
                                  {step.type !== "reminder" && step.type !== "notification" && (
                                    <button
                                      onClick={() => handleTestStep(step, `template-${t.id}-${i}`)}
                                      disabled={testingStep === `template-${t.id}-${i}` || !step.message?.trim()}
                                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
                                      title={step.type === "email" ? `Send test to ${userEmail}` : "Preview with sample data"}
                                    >
                                      {testingStep === `template-${t.id}-${i}` ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Send className="h-3 w-3" />
                                      )}
                                      Test
                                    </button>
                                  )}
                                </div>
                                {step.subject && <p className="mt-0.5 text-xs font-semibold text-foreground">{step.subject}</p>}
                                {step.message && <p className="mt-0.5 text-[11px] text-muted-foreground">{step.message}</p>}
                                {smsPreview?.key === `template-${t.id}-${i}` && (
                                  <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">SMS Preview</p>
                                    <p className="text-xs text-foreground">{smsPreview.message}</p>
                                    <button
                                      onClick={() => setSmsPreview(null)}
                                      className="mt-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
