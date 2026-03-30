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

function drawCertificateImage(
  sigDataUrl: string,
  details: JobDetails,
  finalPrice: number,
  dateStr: string
): Promise<string> {
  return new Promise((resolve) => {
    const W = 800
    const H = 700
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")!

    // White background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, W, H)

    // Border
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, W - 20, H - 20)

    // Header
    ctx.fillStyle = "#9ca3af"
    ctx.font = "bold 11px Arial, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("JOB COMPLETION CERTIFICATE", W / 2, 50)

    ctx.fillStyle = "#111827"
    ctx.font = "bold 24px Arial, sans-serif"
    ctx.fillText("XRoof", W / 2, 80)

    // Divider
    ctx.strokeStyle = "#e5e5e5"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(40, 100)
    ctx.lineTo(W - 40, 100)
    ctx.stroke()

    // Details
    ctx.textAlign = "left"
    const rows = [
      ["Job Type", details.jobType],
      ["Address", details.address],
      ["Customer", details.customerName],
      ["Contractor", details.contractorName],
      ["Final Price", `$${finalPrice.toLocaleString()}`],
      ["Date", dateStr],
    ]

    let y = 135
    for (const [label, value] of rows) {
      ctx.fillStyle = "#6b7280"
      ctx.font = "14px Arial, sans-serif"
      ctx.fillText(label, 60, y)

      ctx.fillStyle = "#111827"
      ctx.font = "bold 14px Arial, sans-serif"
      ctx.textAlign = "right"
      ctx.fillText(value, W - 60, y)
      ctx.textAlign = "left"
      y += 30
    }

    // Confirmation text
    y += 15
    ctx.fillStyle = "#4b5563"
    ctx.font = "13px Arial, sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("I confirm the above work has been completed to my satisfaction", 60, y)
    y += 20
    ctx.fillText(`and the final price of $${finalPrice.toLocaleString()} is accurate.`, 60, y)

    // Signature area
    y += 35
    const sigX = 60
    const sigW = W - 120
    const sigH = 180

    // Dashed border for signature area
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.strokeRect(sigX, y, sigW, sigH)
    ctx.setLineDash([])

    // Draw signature image
    const sigImg = new Image()
    sigImg.onload = () => {
      ctx.drawImage(sigImg, sigX + 5, y + 5, sigW - 10, sigH - 10)

      // Label under signature
      ctx.fillStyle = "#9ca3af"
      ctx.font = "11px Arial, sans-serif"
      ctx.textAlign = "left"
      ctx.fillText("Customer Signature", sigX, y + sigH + 18)

      resolve(canvas.toDataURL("image/png"))
    }
    sigImg.src = sigDataUrl
  })
}

export function SignaturePadModal({ open, onClose, onSave, saving, jobDetails }: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
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
    if (!jobDetails) return

    const price = parseFloat(finalPrice) || 0
    const sigDataUrl = padRef.current.toDataURL("image/png")

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const certDataUrl = await drawCertificateImage(sigDataUrl, jobDetails, price, today)
    onSave(certDataUrl, price)
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

        {/* Certificate preview + signature */}
        <div className="p-4">
          {/* Certificate details preview */}
          <div className="rounded-xl border-2 border-border bg-white p-5 mb-3">
            <div className="mb-4 border-b-2 border-gray-200 pb-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Job Completion Certificate
              </p>
              <p className="text-lg font-bold text-gray-900">XRoof</p>
            </div>

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

          {/* Editable price field */}
          <div>
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
