"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import SignaturePadLib from "signature_pad"
import { supabase } from "@/lib/supabaseClient"
import { ArrowLeft, Save, PenTool, Printer, Mail, Check, RotateCcw, Send, Clock, Eye as EyeIcon } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { DEFAULT_TERMS, type ContractTerms } from "@/components/contract-terms-defaults"

type Job = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  address: string
  zip_code: string
  job_type: string
  description: string
  budget: number | null
}

type Contract = {
  id: string
  job_id: string
  contractor_id: string
  contractor_name: string
  contractor_company: string | null
  contractor_phone: string | null
  contractor_email: string | null
  contractor_address: string | null
  customer_name: string
  project_address: string
  contract_date: string
  contract_price: number
  deposit_percent: number
  terms: ContractTerms
  customer_signature_url: string | null
  contractor_signature_url: string | null
  customer_signed_at: string | null
  contractor_signed_at: string | null
  status: string
}

export default function ContractPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [customerEmailAddr, setCustomerEmailAddr] = useState("")
  const [sendingToCustomer, setSendingToCustomer] = useState(false)
  const [sentToCustomer, setSentToCustomer] = useState(false)
  const [docEvents, setDocEvents] = useState<{ id: string; event_type: string; recipient_email: string; created_at: string }[]>([])

  // Editable fields
  const [contractorName, setContractorName] = useState("")
  const [contractorCompany, setContractorCompany] = useState("")
  const [contractorPhone, setContractorPhone] = useState("")
  const [contractorEmail, setContractorEmail] = useState("")
  const [contractorAddress, setContractorAddress] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [contractPrice, setContractPrice] = useState("")
  const [depositPercent, setDepositPercent] = useState(50)
  const [terms, setTerms] = useState<ContractTerms>(DEFAULT_TERMS)

  // Signature pads
  const contractorCanvasRef = useRef<HTMLCanvasElement>(null)
  const contractorPadRef = useRef<SignaturePadLib | null>(null)
  const [contractorSigEmpty, setContractorSigEmpty] = useState(true)
  const customerCanvasRef = useRef<HTMLCanvasElement>(null)
  const customerPadRef = useRef<SignaturePadLib | null>(null)
  const [customerSigEmpty, setCustomerSigEmpty] = useState(true)
  const [signingMode, setSigningMode] = useState<"in-person" | "email">("in-person")
  const [customerSigning, setCustomerSigning] = useState(false)

  const isSigned = contract?.status === "signed"
  const isPendingCustomer = contract?.status === "pending_customer"
  const isLocked = isSigned || isPendingCustomer

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }
      const user = session.user

      // Fetch job
      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, customer_name, customer_phone, customer_email, address, zip_code, job_type, description, budget")
        .eq("id", jobId)
        .single()

      if (!jobData) { router.push("/contractor/leads"); return }
      setJob(jobData)

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email, company_name")
        .eq("id", user.id)
        .single()

      // Check for existing contract
      const { data: existing } = await supabase
        .from("contracts")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (existing) {
        setContract(existing)
        setContractorName(existing.contractor_name)
        setContractorCompany(existing.contractor_company || "")
        setContractorPhone(existing.contractor_phone || "")
        setContractorEmail(existing.contractor_email || "")
        setContractorAddress(existing.contractor_address || "")
        setCustomerName(existing.customer_name)
        setCustomerAddress(existing.project_address)
        setCustomerPhone(jobData.customer_phone || "")
        setContractPrice(existing.contract_price?.toString() || "")
        setDepositPercent(existing.deposit_percent || 50)
        setTerms({ ...DEFAULT_TERMS, ...existing.terms })
        setCustomerEmailAddr(existing.customer_email || jobData.customer_email || "")
      } else {
        // Pre-fill from profile and job
        setContractorName(profile?.username || user.user_metadata?.username || "")
        setContractorCompany(profile?.company_name || "")
        setContractorEmail(profile?.email || user.email || "")
        setCustomerName(jobData.customer_name)
        setCustomerAddress(`${jobData.address} ${jobData.zip_code}`)
        setCustomerPhone(jobData.customer_phone || "")
        setContractPrice(jobData.budget?.toString() || "")
        setCustomerEmailAddr(jobData.customer_email || "")
      }

      // Fetch document events
      const { data: events } = await supabase
        .from("document_events")
        .select("id, event_type, recipient_email, created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true })
      setDocEvents(events || [])

      setLoading(false)
    }
    load()
  }, [jobId, router])

  const initPad = (canvasRef: React.RefObject<HTMLCanvasElement | null>, onEmpty: (empty: boolean) => void) => {
    if (!canvasRef.current) return null
    const canvas = canvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(ratio, ratio)

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    })
    pad.addEventListener("endStroke", () => onEmpty(pad.isEmpty()))
    onEmpty(true)
    return pad
  }

  // Init contractor signature pad after loading
  useEffect(() => {
    if (loading || isLocked) return
    const timer = setTimeout(() => {
      contractorPadRef.current = initPad(contractorCanvasRef, setContractorSigEmpty)
    }, 200)
    return () => {
      clearTimeout(timer)
      contractorPadRef.current?.off()
    }
  }, [loading, isLocked])

  // Init customer in-person signature pad
  useEffect(() => {
    if (loading || isSigned || signingMode !== "in-person") return
    if (!contract?.contractor_signature_url) return

    // Try multiple times since canvas may not be in DOM immediately after state change
    let attempts = 0
    const tryInit = () => {
      if (customerCanvasRef.current) {
        customerPadRef.current = initPad(customerCanvasRef, setCustomerSigEmpty)
      } else if (attempts < 5) {
        attempts++
        setTimeout(tryInit, 200)
      }
    }
    const timer = setTimeout(tryInit, 100)

    return () => {
      clearTimeout(timer)
      customerPadRef.current?.off()
    }
  }, [loading, isSigned, signingMode, contract?.contractor_signature_url])

  const updateTerm = (key: keyof ContractTerms, value: any) => {
    setTerms((prev) => ({ ...prev, [key]: value }))
  }

  const toggleScopeItem = (index: number) => {
    setTerms((prev) => ({
      ...prev,
      scope_items: prev.scope_items.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      ),
    }))
  }

  const addScopeItem = () => {
    setTerms((prev) => ({
      ...prev,
      scope_items: [...prev.scope_items, { label: "", checked: true }],
    }))
  }

  const updateScopeItemLabel = (index: number, label: string) => {
    setTerms((prev) => ({
      ...prev,
      scope_items: prev.scope_items.map((item, i) =>
        i === index ? { ...item, label } : item
      ),
    }))
  }

  const removeScopeItem = (index: number) => {
    setTerms((prev) => ({
      ...prev,
      scope_items: prev.scope_items.filter((_, i) => i !== index),
    }))
  }

  const handleEditSigned = async () => {
    const msg = isSigned
      ? "Editing this contract will remove all signatures. Both parties will need to sign again. Continue?"
      : "Editing this contract will cancel the pending customer signature. Continue?"
    if (!confirm(msg)) return

    // Reset in DB too so the signing token is cleared
    if (contract?.id) {
      await supabase.from("contracts").update({
        status: "draft",
        contractor_signature_url: null,
        customer_signature_url: null,
        contractor_signed_at: null,
        customer_signed_at: null,
        signing_token: null,
        signing_token_expires_at: null,
      }).eq("id", contract.id)
    }

    setContract((prev) => prev ? {
      ...prev,
      status: "draft",
      contractor_signature_url: null,
      customer_signature_url: null,
      contractor_signed_at: null,
      customer_signed_at: null,
    } : null)
    setSentToCustomer(false)
  }

  const getContractData = () => ({
    job_id: jobId,
    contractor_name: contractorName,
    contractor_company: contractorCompany || null,
    contractor_phone: contractorPhone || null,
    contractor_email: contractorEmail || null,
    contractor_address: contractorAddress || null,
    customer_name: customerName,
    project_address: customerAddress,
    contract_price: parseFloat(contractPrice) || 0,
    deposit_percent: depositPercent,
    terms,
  })

  const handleSaveDraft = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const user = session.user

    const contractData = {
      ...getContractData(),
      contractor_id: user.id,
      status: "draft",
      contractor_signature_url: null,
      customer_signature_url: null,
      contractor_signed_at: null,
      customer_signed_at: null,
    }

    if (contract?.id) {
      const { data, error } = await supabase.from("contracts").update(contractData).eq("id", contract.id).select().single()
      if (error) alert("Error saving: " + error.message)
      else { setContract(data); alert("Draft saved!") }
    } else {
      const { data, error } = await supabase.from("contracts").insert(contractData).select().single()
      if (error) alert("Error saving: " + error.message)
      else { setContract(data); alert("Draft saved!") }
    }
    setSaving(false)
  }

  const uploadSignature = async (pad: SignaturePadLib, prefix: string): Promise<string | null> => {
    const dataUrl = pad.toDataURL("image/png")
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const fileName = `${prefix}-${Date.now()}.png`

    const { error } = await supabase.storage
      .from("contract-signatures")
      .upload(fileName, blob, { contentType: "image/png" })

    if (error) { alert("Error uploading signature: " + error.message); return null }

    const { data } = supabase.storage.from("contract-signatures").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSign = async () => {
    if (!contractorPadRef.current || contractorPadRef.current.isEmpty()) {
      alert("Please sign before saving"); return
    }

    setSigning(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const user = session.user

    const contractorSigUrl = await uploadSignature(contractorPadRef.current, `${jobId}-contractor`)
    if (!contractorSigUrl) { setSigning(false); return }

    const now = new Date().toISOString()
    const contractData = {
      ...getContractData(),
      contractor_id: user.id,
      status: "draft",
      contractor_signature_url: contractorSigUrl,
      contractor_signed_at: now,
    }

    let savedContract: Contract | null = null
    if (contract?.id) {
      const { data, error } = await supabase.from("contracts").update(contractData).eq("id", contract.id).select().single()
      if (error) alert("Error: " + error.message)
      else savedContract = data
    } else {
      const { data, error } = await supabase.from("contracts").insert(contractData).select().single()
      if (error) alert("Error: " + error.message)
      else savedContract = data
    }

    if (savedContract) {
      setContract(savedContract)
      alert("Contract signed and saved! You can now send it to the customer.")
    }

    setSigning(false)
  }

  const handleCustomerSignInPerson = async () => {
    if (!customerPadRef.current || customerPadRef.current.isEmpty()) {
      alert("Customer must sign before saving"); return
    }
    if (!contract?.id) { alert("Save the contract first"); return }

    setCustomerSigning(true)
    const customerSigUrl = await uploadSignature(customerPadRef.current, `${jobId}-customer`)
    if (!customerSigUrl) { setCustomerSigning(false); return }

    const now = new Date().toISOString()
    const { data, error } = await supabase.from("contracts").update({
      customer_signature_url: customerSigUrl,
      customer_signed_at: now,
      status: "signed",
    }).eq("id", contract.id).select().single()

    if (error) {
      alert("Error: " + error.message)
    } else if (data) {
      setContract(data)

      // Track signed event
      await supabase.from("document_events").insert({
        job_id: jobId,
        document_type: "contract",
        document_id: contract.id,
        event_type: "signed",
        recipient_email: "in-person",
      })
    }
    setCustomerSigning(false)
  }

  const handleSendToCustomer = async () => {
    if (!contract?.id) { alert("Save the contract first"); return }
    if (!contract.contractor_signature_url) { alert("Please sign the contract first"); return }
    if (!customerEmailAddr.trim()) { alert("Enter the customer's email address"); return }

    setSendingToCustomer(true)
    try {
      const res = await fetch("/api/contracts/send-signing-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contract.id, customer_email: customerEmailAddr.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        alert("Error: " + data.error)
      } else {
        setSentToCustomer(true)
        setContract((prev) => prev ? { ...prev, status: "pending_customer" } : null)
      }
    } catch {
      alert("Failed to send. Please try again.")
    }
    setSendingToCustomer(false)
  }

  const handleEmail = async () => {
    if (!contract?.id) return
    setEmailing(true)
    try {
      const res = await fetch("/api/send-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: contract.id }),
      })
      const data = await res.json()
      if (data.error) alert("Error: " + data.error)
      else setEmailSent(true)
    } catch {
      alert("Failed to send email")
    }
    setEmailing(false)
  }

  if (loading) return <p className="p-6">Loading contract...</p>
  if (!job) return <p className="p-6">Job not found.</p>

  const price = parseFloat(contractPrice) || 0
  const depositAmount = (price * depositPercent) / 100
  const finalAmount = price - depositAmount

  return (
    <div className="mx-auto max-w-2xl pb-20">
      <div className="mb-4 print:hidden">
        <Link href="/contractor/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Leads
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm print:border-0 print:shadow-none print:bg-white print:text-black" id="contract-content">

        {/* Header */}
        <div className="mb-6 text-center border-b border-border pb-4 print:border-gray-300">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground print:text-gray-500">
            Roofing Contract Agreement
          </p>
          <p className="text-xl font-bold text-foreground print:text-black">XRoof</p>
          {contract?.id && (
            <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-400">
              Contract #{contract.id.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        {/* Parties */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contractor</h3>
            <div className="space-y-2">
              <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} placeholder="Name" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorCompany} onChange={(e) => setContractorCompany(e.target.value)} placeholder="Company" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorPhone} onChange={(e) => setContractorPhone(e.target.value)} placeholder="Phone" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorEmail} onChange={(e) => setContractorEmail(e.target.value)} placeholder="Email" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorAddress} onChange={(e) => setContractorAddress(e.target.value)} placeholder="Address" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
            <div className="space-y-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Project Address" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" disabled={isLocked} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <p className="px-3 py-1.5 text-sm text-muted-foreground print:p-0">
                Contract Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Scope of Work</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Contractor agrees to provide roofing services at the project address including:
          </p>
          <div className="space-y-2">
            {terms.scope_items.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleScopeItem(i)}
                  disabled={isLocked}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary"
                />
                {isSigned ? (
                  <span className="text-sm text-foreground">{item.label}</span>
                ) : (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      value={item.label}
                      onChange={(e) => updateScopeItemLabel(i, e.target.value)}
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                      placeholder="Scope item..."
                    />
                    <button onClick={() => removeScopeItem(i)} className="text-xs text-red-400 hover:text-red-300 px-1">x</button>
                  </div>
                )}
              </div>
            ))}
            {!isLocked && (
              <button onClick={addScopeItem} className="text-xs text-primary hover:text-primary/80 font-medium">
                + Add item
              </button>
            )}
          </div>
          {!isLocked ? (
            <textarea
              value={terms.scope_custom_text}
              onChange={(e) => updateTerm("scope_custom_text", e.target.value)}
              placeholder="Additional scope details..."
              rows={2}
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
            />
          ) : terms.scope_custom_text ? (
            <p className="mt-3 text-sm text-foreground">{terms.scope_custom_text}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            All work will follow manufacturer installation guidelines and industry standards.
          </p>
        </div>

        {/* Contract Price */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Contract Price</h3>
          {!isLocked ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">$</span>
              <input
                type="number"
                value={contractPrice}
                onChange={(e) => setContractPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
          ) : (
            <p className="text-lg font-bold text-foreground">${price.toLocaleString()}</p>
          )}
        </div>

        {/* Work Start Date */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Work Start Date</h3>
          {!isLocked ? (
            <input
              type="date"
              value={terms.work_start_date || ""}
              onChange={(e) => updateTerm("work_start_date", e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {terms.work_start_date ? new Date(terms.work_start_date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "To be determined"}
            </p>
          )}
        </div>

        {/* Payment Terms */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Payment Terms</h3>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Deposit:</span>
              {!isLocked ? (
                <input
                  type="number"
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-center"
                />
              ) : (
                <span className="text-sm font-semibold">{depositPercent}</span>
              )}
              <span className="text-xs text-muted-foreground">%</span>
              <span className="text-xs font-semibold text-foreground">(${depositAmount.toLocaleString()})</span>
            </div>
            <span className="text-xs text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Final:</span>
              <span className="text-sm font-semibold">{100 - depositPercent}%</span>
              <span className="text-xs font-semibold text-foreground">(${finalAmount.toLocaleString()})</span>
            </div>
          </div>
          {!isLocked ? (
            <textarea
              value={terms.payment_terms_text}
              onChange={(e) => updateTerm("payment_terms_text", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none"
            />
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">{terms.payment_terms_text}</p>
          )}
        </div>

        {/* Legal Clauses */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Terms & Conditions</h3>
          <Accordion type="multiple" defaultValue={isLocked ? ["scheduling", "hidden-damage", "subcontractors", "warranty", "governing"] : []}>
            <AccordionItem value="scheduling">
              <AccordionTrigger className="text-sm">Scheduling & Delays</AccordionTrigger>
              <AccordionContent>
                {!isLocked ? (
                  <textarea value={terms.scheduling_text} onChange={(e) => updateTerm("scheduling_text", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.scheduling_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hidden-damage">
              <AccordionTrigger className="text-sm">Hidden Damage</AccordionTrigger>
              <AccordionContent>
                {!isLocked ? (
                  <textarea value={terms.hidden_damage_text} onChange={(e) => updateTerm("hidden_damage_text", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.hidden_damage_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="subcontractors">
              <AccordionTrigger className="text-sm">Subcontractors</AccordionTrigger>
              <AccordionContent>
                {!isLocked ? (
                  <textarea value={terms.subcontractors_text} onChange={(e) => updateTerm("subcontractors_text", e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.subcontractors_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="warranty">
              <AccordionTrigger className="text-sm">Warranty</AccordionTrigger>
              <AccordionContent>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Workmanship warranty:</span>
                  {!isLocked ? (
                    <input type="number" value={terms.warranty_years} onChange={(e) => updateTerm("warranty_years", Number(e.target.value))} className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-center" />
                  ) : (
                    <span className="text-sm font-semibold">{terms.warranty_years}</span>
                  )}
                  <span className="text-xs text-muted-foreground">years</span>
                </div>
                {!isLocked ? (
                  <textarea value={terms.warranty_text} onChange={(e) => updateTerm("warranty_text", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.warranty_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="governing">
              <AccordionTrigger className="text-sm">Governing Law</AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This agreement shall be governed by and construed in accordance with the laws of the State of{" "}
                  {!isLocked ? (
                    <input value={terms.governing_state} onChange={(e) => updateTerm("governing_state", e.target.value)} className="w-28 rounded border border-border bg-background px-2 py-0.5 text-xs inline" />
                  ) : (
                    <strong>{terms.governing_state}</strong>
                  )}
                  . Any disputes arising from this contract shall be resolved in the courts of said state.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Agreement text */}
        <div className="mb-6 rounded-lg bg-secondary/50 p-3 print:bg-gray-50">
          <p className="text-xs font-medium text-foreground print:text-black">
            By signing below, both parties agree to all terms and conditions outlined in this contract.
            This contract is legally binding upon signature by both the Contractor and Customer.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contractor Signature
            </h4>
            {(isLocked || contract?.contractor_signature_url) && contract?.contractor_signature_url ? (
              <div>
                <img src={contract.contractor_signature_url} alt="Contractor signature" className="h-24 w-full rounded-lg border border-border bg-white object-contain" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Signed {contract.contractor_signed_at && new Date(contract.contractor_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div>
                <canvas
                  ref={contractorCanvasRef}
                  className="w-full rounded-lg border-2 border-dashed border-border bg-white"
                  style={{ height: 120, touchAction: "none" }}
                />
                <button
                  onClick={() => { contractorPadRef.current?.clear(); setContractorSigEmpty(true) }}
                  className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Signature
            </h4>
            {contract?.customer_signature_url ? (
              <div>
                <img src={contract.customer_signature_url} alt="Customer signature" className="h-24 w-full rounded-lg border border-border bg-white object-contain" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Signed {contract.customer_signed_at && new Date(contract.customer_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : isPendingCustomer ? (
              <div className="flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-amber-500/30 bg-amber-900/10">
                <Mail className="mb-1 h-5 w-5 text-amber-400" />
                <p className="text-xs text-amber-400 font-medium">Sent to customer</p>
                <p className="text-[10px] text-muted-foreground">Awaiting signature</p>
              </div>
            ) : signingMode === "in-person" && contract?.contractor_signature_url ? (
              <div>
                <canvas
                  ref={customerCanvasRef}
                  className="w-full rounded-lg border-2 border-dashed border-border bg-white"
                  style={{ height: 120, touchAction: "none" }}
                />
                <button
                  onClick={() => { customerPadRef.current?.clear(); setCustomerSigEmpty(true) }}
                  className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20">
                <p className="text-xs text-muted-foreground">
                  {signingMode === "email" ? "Customer signs via email" : "Sign contract first"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {signingMode === "email" ? "Send signing link below" : "Then customer can sign here"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Signing Mode Toggle + Email/In-Person Options */}
        {!isSigned && !isPendingCustomer && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-3">
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">How will the customer sign?</label>
            <div className="mb-3 flex gap-1 rounded-lg bg-secondary/50 p-1">
              <button
                onClick={() => setSigningMode("in-person")}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  signingMode === "in-person"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PenTool className="mr-1.5 inline h-3.5 w-3.5" />
                In Person
              </button>
              <button
                onClick={() => setSigningMode("email")}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  signingMode === "email"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                Via Email
              </button>
            </div>
            {signingMode === "email" && (
              <div>
                <input
                  type="email"
                  value={customerEmailAddr}
                  onChange={(e) => setCustomerEmailAddr(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            )}
            {signingMode === "in-person" && (
              <p className="text-xs text-muted-foreground">
                Hand the device to the customer to sign directly on screen after you sign.
              </p>
            )}
          </div>
        )}

        {/* Email input when pending customer (for resending) */}
        {isPendingCustomer && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-3">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Customer Email (for signing link)</label>
            <input
              type="email"
              value={customerEmailAddr}
              onChange={(e) => setCustomerEmailAddr(e.target.value)}
              placeholder="customer@email.com"
              disabled
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>
        )}
      </div>

      {/* Status Badge */}
      {(isPendingCustomer || isSigned) && (
        <div className={`mt-4 rounded-xl p-3 text-center text-sm font-semibold print:hidden ${
          isSigned
            ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/30"
            : "bg-amber-900/20 text-amber-400 border border-amber-800/30"
        }`}>
          {isSigned ? "Contract fully signed by both parties" : "Awaiting customer signature — signing link sent via email"}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {/* Draft state: Save + Sign + Send */}
        {!isLocked && (
          <>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </button>
            {!contract?.contractor_signature_url ? (
              <button
                onClick={handleSign}
                disabled={signing || contractorSigEmpty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <PenTool className="h-4 w-4" />
                {signing ? "Signing..." : "Sign & Save"}
              </button>
            ) : signingMode === "email" ? (
              <button
                onClick={handleSendToCustomer}
                disabled={sendingToCustomer || !customerEmailAddr.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendingToCustomer ? "Sending..." : "Send to Customer"}
              </button>
            ) : (
              <button
                onClick={handleCustomerSignInPerson}
                disabled={customerSigning || customerSigEmpty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <PenTool className="h-4 w-4" />
                {customerSigning ? "Saving..." : "Customer Sign & Complete"}
              </button>
            )}
          </>
        )}

        {/* Pending customer state */}
        {isPendingCustomer && (
          <>
            <button
              onClick={handleEditSigned}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Edit Contract
            </button>
            <button
              onClick={handleSendToCustomer}
              disabled={sendingToCustomer || sentToCustomer}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {sentToCustomer ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {sendingToCustomer ? "Resending..." : sentToCustomer ? "Link Resent" : "Resend Signing Link"}
            </button>
          </>
        )}

        {/* Signed state */}
        {isSigned && (
          <>
            <button
              onClick={handleEditSigned}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <RotateCcw className="h-4 w-4" />
              Edit Contract
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleEmail}
              disabled={emailing || emailSent}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {emailSent ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {emailing ? "Sending..." : emailSent ? "Email Sent" : "Email Contract"}
            </button>
          </>
        )}
      </div>

      {/* Document Activity */}
      {docEvents.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm print:hidden">
          <h3 className="mb-3 text-sm font-bold text-foreground">Document Activity</h3>
          <div className="space-y-2">
            {docEvents.map((ev) => {
              const icon = ev.event_type === "sent" ? <Send className="h-3.5 w-3.5 text-blue-400" />
                : ev.event_type === "opened" ? <EyeIcon className="h-3.5 w-3.5 text-amber-400" />
                : ev.event_type === "signed" ? <PenTool className="h-3.5 w-3.5 text-emerald-400" />
                : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              const label = ev.event_type === "sent" ? "Contract sent"
                : ev.event_type === "opened" ? "Email opened"
                : ev.event_type === "signed" ? "Contract signed"
                : ev.event_type === "viewed" ? "Link clicked"
                : ev.event_type
              return (
                <div key={ev.id} className="flex items-center gap-3 text-sm">
                  {icon}
                  <span className="font-medium text-foreground">{label}</span>
                  {ev.recipient_email && <span className="text-xs text-muted-foreground">({ev.recipient_email})</span>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {new Date(ev.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden, nav, header, [data-slot="sidebar"] { display: none !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:text-gray-500 { color: #6b7280 !important; }
          .print\\:text-gray-400 { color: #9ca3af !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          input:disabled, textarea:disabled { opacity: 1 !important; }
          [data-slot="accordion-content"] { display: block !important; height: auto !important; }
          [data-slot="accordion-trigger"] svg { display: none !important; }
        }
      `}</style>
    </div>
  )
}
