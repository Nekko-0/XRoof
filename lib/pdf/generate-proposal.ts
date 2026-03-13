import { renderToBuffer } from "@react-pdf/renderer"
import { ProposalDocument, type ProposalData } from "./proposal-document"
import React from "react"

/**
 * Fetch an image URL and return it as a Buffer.
 * Returns null if the fetch fails (missing image, CORS, etc.).
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      console.error(`[PDF] Image fetch failed: ${res.status} ${res.statusText} — ${url}`)
      return null
    }
    const arrayBuf = await res.arrayBuffer()
    return Buffer.from(arrayBuf)
  } catch (err) {
    console.error(`[PDF] Image fetch error for ${url}:`, err)
    return null
  }
}

interface GenerateOptions {
  report: Record<string, unknown>
  profile: {
    company_name?: string
    widget_color?: string
    logo_url?: string
    phone?: string
    email?: string
    business_address?: string
    license_number?: string
    company_tagline?: string
  }
}

/**
 * Generate a branded PDF proposal from report + profile data.
 * Returns a Buffer containing the PDF.
 */
export async function generateProposalPdf({ report, profile }: GenerateOptions): Promise<Buffer> {
  const primaryColor = profile.widget_color || "#059669"

  // Fetch logo and visible photos in parallel
  const photoUrls: string[] = (report.photo_urls as string[]) || []
  const photoVisible: boolean[] = (report.photo_visible as boolean[]) || []

  const logoUrl = profile.logo_url || (report.logo_url as string) || ""
  const visiblePhotoUrls = photoUrls.filter((u, i) => u && photoVisible[i])
  console.log(`[PDF] Generating proposal — logo: ${logoUrl || "(none)"}, photos: ${visiblePhotoUrls.length}`)

  const imagePromises: Promise<Buffer | null>[] = [
    fetchImageBuffer(logoUrl),
  ]

  for (let i = 0; i < photoUrls.length; i++) {
    if (photoUrls[i] && photoVisible[i]) {
      imagePromises.push(fetchImageBuffer(photoUrls[i]))
    } else {
      imagePromises.push(Promise.resolve(null))
    }
  }

  const [logoBuffer, ...photoBuffers] = await Promise.all(imagePromises)

  const data: ProposalData = {
    company_name: (profile.company_name || report.company_name || "Roofing Company") as string,
    company_email: (profile.email || report.company_email || "") as string,
    company_phone: (profile.phone || report.company_phone || "") as string,
    logo_url: (profile.logo_url || report.logo_url || "") as string,
    business_address: (profile.business_address || "") as string,
    license_number: (profile.license_number || "") as string,
    company_tagline: (profile.company_tagline || "") as string,
    customer_name: (report.customer_name || "") as string,
    customer_address: (report.customer_address || "") as string,
    customer_phone: (report.customer_phone || "") as string,
    job_type: (report.job_type || "") as string,
    roof_squares: (report.roof_squares as number) || null,
    roof_pitch: (report.roof_pitch || "") as string,
    measurement_data: report.measurement_data as ProposalData["measurement_data"],
    photo_urls: photoUrls,
    photo_captions: (report.photo_captions as string[]) || [],
    photo_visible: photoVisible,
    scope_of_work: (report.scope_of_work || "") as string,
    recommendations: (report.recommendations || "") as string,
    price_quote: (report.price_quote as number) || null,
    material: (report.material || "") as string,
    notes: (report.notes || "") as string,
    pricing_tiers: (report.pricing_tiers as ProposalData["pricing_tiers"]) || null,
    deposit_percent: (report.deposit_percent as number) || null,
    estimate_line_items: (report.estimate_line_items as ProposalData["estimate_line_items"]) || null,
    worker_name: (report.worker_name || "") as string,
    worker_title: (report.worker_title || "") as string,
    worker_phone: (report.worker_phone || "") as string,
    materials_visible: !!report.materials_visible,
    materials_data: report.materials_data as ProposalData["materials_data"],
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(ProposalDocument, {
      data,
      primaryColor,
      logoBuffer,
      photoBuffers,
    }) as any
  )

  return Buffer.from(pdfBuffer)
}
