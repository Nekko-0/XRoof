"use client"

import { useEffect, useRef, useState } from "react"
import SignaturePad from "signature_pad"
import { X, Eraser, Save } from "lucide-react"

type JobDetails = {
  jobType: string
  address: string
  customerName: string
  contractorName: string
  budget: number | null
}

type SignaturePadModalProps = {
  open: boolean
  onClose: () => void
  onSave: (dataUrl: string, finalPrice: number) => void
  saving?: boolean
  jobDetails?: JobDetails
}

export function SignaturePadModal({ open, onClose, onSave, saving, jobDetails }: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [finalPrice, setFinalPrice] = useState("")

  useEffect(() => {
    if (!open) return
    setFinalPrice(jobDetails?.budget?.toString() || "")
  }, [open, jobDetails?.budget])

  useEffect(() => {
    if (!open || !canvasRef.current) return

    const canvas = canvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext("2d")
    if (ctx) ctx.scale(ratio, ratio)

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    })

    pad.addEventListener("endStroke", () => {
      setIsEmpty(pad.isEmpty())
    })

    padRef.current = pad
    setIsEmpty(true)

    return () => {
      pad.off()
      padRef.current = null
    }
  }, [open])

  const handleClear = () => {
    padRef.current?.clear()
    setIsEmpty(true)
  }

  const handleSave = async () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    if (!certificateRef.current) return

    const price = parseFloat(finalPrice) || 0

    // Dynamically import html2canvas
    const html2canvas = (await import("html2canvas")).default

    const certCanvas = await html2canvas(certificateRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    })

    const dataUrl = certCanvas.toDataURL("image/png")
    onSave(dataUrl, price)
  }

  if (!open) return null

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-bold text-foreground">Job Completion Certificate</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate content (captured as image) */}
        <div className="p-4">
          <div
            ref={certificateRef}
            className="rounded-xl border-2 border-border bg-white p-5"
          >
            {/* Certificate header */}
            <div className="mb-4 border-b-2 border-gray-200 pb-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Job Completion Certificate
              </p>
              <p className="text-lg font-bold text-gray-900">XRoof</p>
            </div>

            {/* Job details */}
            <div className="mb-4 space-y-1.5 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Job Type</span>
                <span className="font-semibold text-gray-900">{jobDetails?.jobType || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Address</span>
                <span className="font-semibold text-gray-900">{jobDetails?.address || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Customer</span>
                <span className="font-semibold text-gray-900">{jobDetails?.customerName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Contractor</span>
                <span className="font-semibold text-gray-900">{jobDetails?.contractorName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Final Price</span>
                <span className="font-bold text-gray-900">${Number(finalPrice || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Date</span>
                <span className="font-semibold text-gray-900">{today}</span>
              </div>
            </div>

            {/* Confirmation text */}
            <p className="mb-4 text-xs leading-relaxed text-gray-600">
              I confirm the above work has been completed to my satisfaction
              and the final price of{" "}
              <strong className="text-gray-900">
                ${Number(finalPrice || 0).toLocaleString()}
              </strong>{" "}
              is accurate.
            </p>

            {/* Signature canvas */}
            <div>
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-white"
                style={{ height: 150, touchAction: "none" }}
              />
              <p className="mt-1 text-[10px] text-gray-400">Customer Signature</p>
            </div>
          </div>

          {/* Editable price field (outside the certificate capture area visually, but price value syncs) */}
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Adjust final price before signing
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">$</span>
              <input
                type="number"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            <Eraser className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={isEmpty || saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save Certificate"}
          </button>
        </div>
      </div>
    </div>
  )
}
