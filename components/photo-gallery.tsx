"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { Camera, Upload, Trash2, X, Image as ImageIcon, ArrowLeftRight } from "lucide-react"
import { BeforeAfterSlider } from "./before-after-slider"

type Photo = {
  id: string
  url: string
  caption: string
  category: string
  created_at: string
}

const CATEGORIES = ["before", "during", "after", "damage"] as const

interface PhotoGalleryProps {
  jobId: string
  contractorId: string
}

export function PhotoGallery({ jobId, contractorId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [lightbox, setLightbox] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchPhotos = async () => {
      const res = await authFetch(`/api/job-photos?job_id=${jobId}`)
      const data = await res.json()
      if (Array.isArray(data)) setPhotos(data)
      setLoading(false)
    }
    fetchPhotos()
  }, [jobId])

  const handleUpload = async (files: FileList | null, category: string) => {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const path = `job-${jobId}/${category}-${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job-photos")
        .upload(path, file, { upsert: true })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        continue
      }

      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(uploadData.path)

      const res = await authFetch("/api/job-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          contractor_id: contractorId,
          url: urlData.publicUrl,
          category,
        }),
      })

      const photo = await res.json()
      if (photo.id) {
        setPhotos((prev) => [...prev, photo])
      }
    }

    setUploading(false)
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return
    const res = await authFetch(`/api/job-photos?id=${photoId}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
      if (lightbox?.id === photoId) setLightbox(null)
    }
  }

  const filteredPhotos = activeCategory === "all" ? photos : activeCategory === "compare" ? photos : photos.filter((p) => p.category === activeCategory)

  const beforePhotos = photos.filter((p) => p.category === "before")
  const afterPhotos = photos.filter((p) => p.category === "after")
  const canCompare = beforePhotos.length > 0 && afterPhotos.length > 0

  if (loading) return <p className="text-sm text-muted-foreground">Loading photos...</p>

  return (
    <div>
      {/* Category Tabs */}
      <div className="mb-3 flex flex-wrap gap-1">
        {["all", ...CATEGORIES].map((cat) => {
          const count = cat === "all" ? photos.length : photos.filter((p) => p.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </button>
          )
        })}
        {canCompare && (
          <button
            onClick={() => setActiveCategory("compare")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1 ${
              activeCategory === "compare"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeftRight className="h-3 w-3" /> Compare
          </button>
        )}
      </div>

      {/* Upload Buttons */}
      <div className="mb-3 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.accept = "image/*"
              input.multiple = true
              input.onchange = (e) => handleUpload((e.target as HTMLInputElement).files, cat)
              input.click()
            }}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors disabled:opacity-50 capitalize"
          >
            <Upload className="h-3 w-3" />
            {cat}
          </button>
        ))}
      </div>

      {uploading && <p className="mb-3 text-xs text-primary animate-pulse">Uploading...</p>}

      {/* Before/After Compare View */}
      {activeCategory === "compare" && canCompare && (
        <div className="space-y-4 mb-4">
          <p className="text-xs text-muted-foreground">
            Drag the slider to compare before and after photos. Showing {Math.min(beforePhotos.length, afterPhotos.length)} comparison{Math.min(beforePhotos.length, afterPhotos.length) > 1 ? "s" : ""}.
          </p>
          {beforePhotos.slice(0, afterPhotos.length).map((bp, i) => (
            <BeforeAfterSlider
              key={bp.id}
              beforeUrl={bp.url}
              afterUrl={afterPhotos[i].url}
              beforeLabel={bp.caption || "Before"}
              afterLabel={afterPhotos[i]?.caption || "After"}
              height={280}
            />
          ))}
        </div>
      )}

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Camera className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No photos yet. Upload some above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
              <button onClick={() => setLightbox(photo)} className="w-full h-full">
                <img src={photo.url} alt={photo.caption || photo.category} className="h-full w-full object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-semibold text-white uppercase">{photo.category}</span>
              </div>
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 shadow-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-black" />
            </button>
            <div className="mt-2 text-center">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white capitalize">
                {lightbox.category}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
