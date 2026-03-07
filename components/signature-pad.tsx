"use client"

import { useEffect, useRef, useState } from "react"
import SignaturePad from "signature_pad"
import { X, Eraser, Save } from "lucide-react"

type SignaturePadModalProps = {
  open: boolean
  onClose: () => void
  onSave: (dataUrl: string) => void
  saving?: boolean
}

export function SignaturePadModal({ open, onClose, onSave, saving }: SignaturePadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

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

  const handleSave = () => {
    if (!padRef.current || padRef.current.isEmpty()) return
    const dataUrl = padRef.current.toDataURL("image/png")
    onSave(dataUrl)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-bold text-foreground">Customer Signature</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Have the customer sign below to confirm the work.
          </p>
          <canvas
            ref={canvasRef}
            className="w-full rounded-xl border-2 border-dashed border-border bg-white"
            style={{ height: 200, touchAction: "none" }}
          />
        </div>

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
            {saving ? "Saving..." : "Save Signature"}
          </button>
        </div>
      </div>
    </div>
  )
}
