"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Printer, Clock, Send, Eye as EyeIcon, PenTool } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { DEFAULT_TERMS, type ContractTerms } from "@/components/contract-terms-defaults"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

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

export default function AdminContractViewPage() {
  const params = useParams()
  const jobId = params.jobId as string

  const [job, setJob] = useState<Job | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [docEvents, setDocEvents] = useState<{ id: string; event_type: string; recipient_email: string; created_at: string }[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const res = await fetch(`/api/contracts/${jobId}`)
        const data = await res.json()

        setDebugInfo(data.debug || null)
        if (data.job) setJob(data.job)
        if (data.contract) {
          setContract({
            ...data.contract,
            terms: { ...DEFAULT_TERMS, ...data.contract.terms },
          })
        }

        // Fetch document events
        const { data: events } = await supabase
          .from("document_events")
          .select("id, event_type, recipient_email, created_at")
          .eq("job_id", jobId)
          .order("created_at", { ascending: true })
        setDocEvents(events || [])
      } catch (err) {
        console.error("Failed to fetch contract:", err)
        setDebugInfo({ fetchError: String(err) })
      }

      setLoading(false)
    }
    load()
  }, [jobId])

  if (loading) return <p className="p-6">Loading contract...</p>
  if (!job) return <p className="p-6">Job not found.</p>
  if (!contract) return (
    <div className="p-6">
      <Link href="/admin/contractors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Contractors
      </Link>
      <p className="text-muted-foreground">No contract has been created for this job yet.</p>
      {debugInfo && (
        <pre className="mt-4 rounded bg-secondary/30 p-3 text-xs text-muted-foreground overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  )

  const terms = contract.terms
  const price = contract.contract_price || 0
  const depositPercent = contract.deposit_percent || 50
  const depositAmount = (price * depositPercent) / 100
  const finalAmount = price - depositAmount

  return (
    <div className="mx-auto max-w-2xl pb-20">
      <div className="mb-4 print:hidden">
        <Link href="/admin/contractors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Contractors
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm print:border-0 print:shadow-none print:bg-white print:text-black" id="contract-content">

        {/* Header */}
        <div className="mb-6 text-center border-b border-border pb-4 print:border-gray-300">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground print:text-gray-500">
            Roofing Contract Agreement
          </p>
          <p className="text-xl font-bold text-foreground print:text-black">XRoof</p>
          <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-400">
            Contract #{contract.id.slice(0, 8).toUpperCase()}
          </p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            contract.status === "signed"
              ? "bg-emerald-900/30 text-emerald-400"
              : contract.status === "pending_customer"
              ? "bg-amber-900/30 text-amber-400"
              : "bg-blue-900/30 text-blue-400"
          }`}>
            {contract.status === "pending_customer" ? "Awaiting Customer Signature" : contract.status}
          </span>
        </div>

        {/* Parties */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contractor</h3>
            <div className="space-y-1 text-sm text-foreground">
              <p>{contract.contractor_name}</p>
              {contract.contractor_company && <p className="text-muted-foreground">{contract.contractor_company}</p>}
              {contract.contractor_phone && <p className="text-muted-foreground">{contract.contractor_phone}</p>}
              {contract.contractor_email && <p className="text-muted-foreground">{contract.contractor_email}</p>}
              {contract.contractor_address && <p className="text-muted-foreground">{contract.contractor_address}</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
            <div className="space-y-1 text-sm text-foreground">
              <p>{contract.customer_name}</p>
              <p className="text-muted-foreground">{contract.project_address}</p>
              {job.customer_phone && <p className="text-muted-foreground">{job.customer_phone}</p>}
              {contract.contract_date && (
                <p className="text-muted-foreground">
                  Contract Date: {new Date(contract.contract_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
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
                <input type="checkbox" checked={item.checked} disabled className="mt-1 h-4 w-4 rounded border-border accent-primary" />
                <span className="text-sm text-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          {terms.scope_custom_text && (
            <p className="mt-3 text-sm text-foreground">{terms.scope_custom_text}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            All work will follow manufacturer installation guidelines and industry standards.
          </p>
        </div>

        {/* Contract Price */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Contract Price</h3>
          <p className="text-lg font-bold text-foreground">${price.toLocaleString()}</p>
        </div>

        {/* Work Start Date */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Work Start Date</h3>
          <p className="text-sm font-semibold text-foreground">
            {terms.work_start_date ? new Date(terms.work_start_date + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "To be determined"}
          </p>
        </div>

        {/* Payment Terms */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Payment Terms</h3>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Deposit:</span>
              <span className="text-sm font-semibold">{depositPercent}</span>
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
          <p className="text-xs text-muted-foreground leading-relaxed">{terms.payment_terms_text}</p>
        </div>

        {/* Legal Clauses */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-bold text-foreground print:text-black">Terms & Conditions</h3>
          <Accordion type="multiple" defaultValue={["scheduling", "hidden-damage", "subcontractors", "warranty", "governing"]}>
            <AccordionItem value="scheduling">
              <AccordionTrigger className="text-sm">Scheduling & Delays</AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{terms.scheduling_text}</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="hidden-damage">
              <AccordionTrigger className="text-sm">Hidden Damage</AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{terms.hidden_damage_text}</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="subcontractors">
              <AccordionTrigger className="text-sm">Subcontractors</AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{terms.subcontractors_text}</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="warranty">
              <AccordionTrigger className="text-sm">Warranty</AccordionTrigger>
              <AccordionContent>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Workmanship warranty:</span>
                  <span className="text-sm font-semibold">{terms.warranty_years}</span>
                  <span className="text-xs text-muted-foreground">years</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{terms.warranty_text}</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="governing">
              <AccordionTrigger className="text-sm">Governing Law</AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This agreement shall be governed by and construed in accordance with the laws of the State of{" "}
                  <strong>{terms.governing_state}</strong>
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
            {contract.contractor_signature_url ? (
              <div>
                <img src={contract.contractor_signature_url} alt="Contractor signature" className="h-24 w-full rounded-lg border border-border bg-white object-contain" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Signed {contract.contractor_signed_at && new Date(contract.contractor_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20">
                <p className="text-xs text-muted-foreground">Not signed yet</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer Signature
            </h4>
            {contract.customer_signature_url ? (
              <div>
                <img src={contract.customer_signature_url} alt="Customer signature" className="h-24 w-full rounded-lg border border-border bg-white object-contain" />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Signed {contract.customer_signed_at && new Date(contract.customer_signed_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20">
                <p className="text-xs text-muted-foreground">Not signed yet</p>
              </div>
            )}
          </div>
        </div>
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

      {/* Print button only */}
      <div className="mt-4 flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
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
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          [data-slot="accordion-content"] { display: block !important; height: auto !important; }
          [data-slot="accordion-trigger"] svg { display: none !important; }
        }
      `}</style>
    </div>
  )
}
