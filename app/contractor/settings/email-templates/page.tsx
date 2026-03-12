"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { useToast } from "@/lib/toast-context"
import { Mail, Plus, Trash2, Save, Edit2 } from "lucide-react"

type Template = {
  id: string
  contractor_id: string
  template_type: string
  subject: string
  body_html: string
  created_at: string
}

const TEMPLATE_TYPES = [
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "followup", label: "Follow-Up" },
  { value: "review_request", label: "Review Request" },
  { value: "welcome", label: "Welcome" },
] as const

const PLACEHOLDER_TOKENS = [
  "{customer_name}",
  "{company_name}",
  "{job_address}",
  "{estimate_link}",
  "{invoice_link}",
  "{portal_link}",
]

export default function EmailTemplatesPage() {
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Template | null>(null)
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState<string>(TEMPLATE_TYPES[0].value)
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth")
        return
      }
      setUserId(session.user.id)
      fetchTemplates(session.user.id)
    })
  }, [router])

  async function fetchTemplates(contractorId: string) {
    setLoading(true)
    const res = await authFetch(`/api/email-templates?contractor_id=${contractorId}`)
    const json = await res.json()
    if (res.ok) {
      setTemplates(json.templates)
    } else {
      toast.error(json.error || "Failed to load templates")
    }
    setLoading(false)
  }

  function startEdit(t: Template) {
    setEditing(t)
    setSubject(t.subject)
    setBodyHtml(t.body_html)
    setShowNew(false)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    const res = await authFetch("/api/email-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, subject, body_html: bodyHtml }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      toast.success("Template saved")
      setEditing(null)
      if (userId) fetchTemplates(userId)
    } else {
      toast.error(json.error || "Save failed")
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return
    const res = await authFetch("/api/email-templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success("Template deleted")
      setEditing(null)
      if (userId) fetchTemplates(userId)
    } else {
      const json = await res.json()
      toast.error(json.error || "Delete failed")
    }
  }

  async function handleCreate() {
    if (!userId || !newSubject.trim()) {
      toast.error("Subject is required")
      return
    }
    setSaving(true)
    const res = await authFetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: userId,
        template_type: newType,
        subject: newSubject,
        body_html: newBody,
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (res.ok) {
      toast.success("Template created")
      setShowNew(false)
      setNewSubject("")
      setNewBody("")
      fetchTemplates(userId)
    } else {
      toast.error(json.error || "Create failed")
    }
  }

  function labelForType(type: string) {
    return TEMPLATE_TYPES.find((t) => t.value === type)?.label || type
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          </div>
          <button
            onClick={() => { setShowNew(true); setEditing(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>

        {/* New template form */}
        {showNew && (
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">New Template</h2>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Template Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              >
                {TEMPLATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Subject</label>
              <input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Your estimate is ready, {customer_name}!"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Body (HTML)</label>
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={8}
                placeholder="Write your email body here. Use placeholder tokens below."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {PLACEHOLDER_TOKENS.map((token) => (
                  <span
                    key={token}
                    onClick={() => setNewBody((b) => b + token)}
                    className="cursor-pointer px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 hover:bg-blue-500/20 transition"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Create"}
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm hover:bg-card transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Template list */}
        {loading ? (
          <div className="text-foreground/50 text-center py-12">Loading templates...</div>
        ) : templates.length === 0 && !showNew ? (
          <div className="text-center py-16 text-foreground/50">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No email templates yet. Click &quot;Add Template&quot; to create one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`bg-card border rounded-2xl p-4 flex items-center justify-between transition cursor-pointer hover:border-blue-500/40 ${
                  editing?.id === t.id ? "border-blue-500" : "border-border"
                }`}
                onClick={() => startEdit(t)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">
                      {labelForType(t.template_type)}
                    </span>
                  </div>
                  <p className="text-foreground font-medium truncate">{t.subject}</p>
                  <p className="text-foreground/40 text-xs mt-0.5">
                    Created {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(t) }}
                    className="p-2 rounded-lg hover:bg-background text-foreground/60 hover:text-foreground transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id) }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-foreground/60 hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div className="bg-card border border-blue-500/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-400" />
              Edit: {labelForType(editing.template_type)}
            </h2>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-foreground/70 mb-1">Body (HTML)</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {PLACEHOLDER_TOKENS.map((token) => (
                  <span
                    key={token}
                    onClick={() => setBodyHtml((b) => b + token)}
                    className="cursor-pointer px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20 hover:bg-blue-500/20 transition"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm hover:bg-card transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
    </div>
  )
}
