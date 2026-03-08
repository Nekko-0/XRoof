"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import SignaturePadLib from "signature_pad"
import { supabase } from "@/lib/supabaseClient"
import { ArrowLeft, Save, PenTool, Printer, Mail, Check, RotateCcw } from "lucide-react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { DEFAULT_TERMS, type ContractTerms } from "@/components/contract-terms-defaults"

type Job = {
  id: string
  customer_name: string
  customer_phone: string
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
  const customerCanvasRef = useRef<HTMLCanvasElement>(null)
  const contractorPadRef = useRef<SignaturePadLib | null>(null)
  const customerPadRef = useRef<SignaturePadLib | null>(null)
  const [contractorSigEmpty, setContractorSigEmpty] = useState(true)
  const [customerSigEmpty, setCustomerSigEmpty] = useState(true)

  const isSigned = contract?.status === "signed"

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth"); return }

      // Fetch job
      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, customer_name, customer_phone, address, zip_code, job_type, description, budget")
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
      } else {
        // Pre-fill from profile and job
        setContractorName(profile?.username || user.user_metadata?.username || "")
        setContractorCompany(profile?.company_name || "")
        setContractorEmail(profile?.email || user.email || "")
        setCustomerName(jobData.customer_name)
        setCustomerAddress(`${jobData.address} ${jobData.zip_code}`)
        setCustomerPhone(jobData.customer_phone || "")
        setContractPrice(jobData.budget?.toString() || "")
      }

      setLoading(false)
    }
    load()
  }, [jobId, router])

  // Init signature pads after loading
  useEffect(() => {
    if (loading || isSigned) return

    const initPad = (
      canvasRef: React.RefObject<HTMLCanvasElement | null>,
      padRef: React.MutableRefObject<SignaturePadLib | null>,
      setEmpty: (v: boolean) => void
    ) => {
      if (!canvasRef.current) return
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
      pad.addEventListener("endStroke", () => setEmpty(pad.isEmpty()))
      padRef.current = pad
      setEmpty(true)
    }

    const timer = setTimeout(() => {
      initPad(contractorCanvasRef, contractorPadRef, setContractorSigEmpty)
      initPad(customerCanvasRef, customerPadRef, setCustomerSigEmpty)
    }, 200)

    return () => {
      clearTimeout(timer)
      contractorPadRef.current?.off()
      customerPadRef.current?.off()
    }
  }, [loading, isSigned])

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

  const handleEditSigned = () => {
    if (!confirm("Editing this contract will remove all signatures. Both parties will need to sign again. Continue?")) return
    setContract((prev) => prev ? {
      ...prev,
      status: "draft",
      contractor_signature_url: null,
      customer_signature_url: null,
      contractor_signed_at: null,
      customer_signed_at: null,
    } : null)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
      alert("Contractor signature is required"); return
    }
    if (!customerPadRef.current || customerPadRef.current.isEmpty()) {
      alert("Customer signature is required"); return
    }

    setSigning(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const contractorSigUrl = await uploadSignature(contractorPadRef.current, `${jobId}-contractor`)
    if (!contractorSigUrl) { setSigning(false); return }

    const customerSigUrl = await uploadSignature(customerPadRef.current, `${jobId}-customer`)
    if (!customerSigUrl) { setSigning(false); return }

    const now = new Date().toISOString()
    const contractData = {
      ...getContractData(),
      contractor_id: user.id,
      status: "signed",
      contractor_signature_url: contractorSigUrl,
      customer_signature_url: customerSigUrl,
      contractor_signed_at: now,
      customer_signed_at: now,
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
      await supabase.from("jobs").update({
        signature_url: customerSigUrl,
        budget: parseFloat(contractPrice) || 0,
        signed_at: now,
      }).eq("id", jobId)
    }

    setSigning(false)
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
              <input value={contractorName} onChange={(e) => setContractorName(e.target.value)} placeholder="Name" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorCompany} onChange={(e) => setContractorCompany(e.target.value)} placeholder="Company" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorPhone} onChange={(e) => setContractorPhone(e.target.value)} placeholder="Phone" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorEmail} onChange={(e) => setContractorEmail(e.target.value)} placeholder="Email" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={contractorAddress} onChange={(e) => setContractorAddress(e.target.value)} placeholder="Address" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
            <div className="space-y-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Project Address" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone" disabled={isSigned} className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-60 print:border-0 print:p-0 print:bg-transparent" />
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
                  disabled={isSigned}
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
            {!isSigned && (
              <button onClick={addScopeItem} className="text-xs text-primary hover:text-primary/80 font-medium">
                + Add item
              </button>
            )}
          </div>
          {!isSigned ? (
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
          {!isSigned ? (
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
          {!isSigned ? (
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
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Deposit:</span>
              {!isSigned ? (
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
          {!isSigned ? (
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
          <Accordion type="multiple" defaultValue={isSigned ? ["scheduling", "hidden-damage", "subcontractors", "warranty", "governing"] : []}>
            <AccordionItem value="scheduling">
              <AccordionTrigger className="text-sm">Scheduling & Delays</AccordionTrigger>
              <AccordionContent>
                {!isSigned ? (
                  <textarea value={terms.scheduling_text} onChange={(e) => updateTerm("scheduling_text", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.scheduling_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hidden-damage">
              <AccordionTrigger className="text-sm">Hidden Damage</AccordionTrigger>
              <AccordionContent>
                {!isSigned ? (
                  <textarea value={terms.hidden_damage_text} onChange={(e) => updateTerm("hidden_damage_text", e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs resize-none" />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">{terms.hidden_damage_text}</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="subcontractors">
              <AccordionTrigger className="text-sm">Subcontractors</AccordionTrigger>
              <AccordionContent>
                {!isSigned ? (
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
                  {!isSigned ? (
                    <input type="number" value={terms.warranty_years} onChange={(e) => updateTerm("warranty_years", Number(e.target.value))} className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-center" />
                  ) : (
                    <span className="text-sm font-semibold">{terms.warranty_years}</span>
                  )}
                  <span className="text-xs text-muted-foreground">years</span>
                </div>
                {!isSigned ? (
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
                  {!isSigned ? (
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
            {isSigned && contract?.contractor_signature_url ? (
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
            {isSigned && contract?.customer_signature_url ? (
              <div>
                <img src={contract.customer_signature_url} alt="Customer signature" className="h-24 w-full rounded-lg border border-border bg-white object-contain" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Signed {contract.customer_signed_at && new Date(contract.customer_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        {!isSigned && (
          <>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handleSign}
              disabled={signing || contractorSigEmpty || customerSigEmpty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <PenTool className="h-4 w-4" />
              {signing ? "Signing..." : "Sign & Submit"}
            </button>
          </>
        )}
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
