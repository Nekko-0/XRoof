import { renderToBuffer } from "@react-pdf/renderer"
import sharp from "sharp"
import { ProposalDocument, type ProposalData } from "./proposal-document"
import React from "react"

/**
 * Fetch an image URL and return it as a base64 data URI (PNG).
 * Converts WebP → PNG since react-pdf only supports PNG/JPEG.
 * Returns null on any failure.
 */
async function fetchAsDataUri(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      console.error(`[PDF] Image fetch failed: ${res.status} — ${url}`)
      return null
    }
    const contentType = res.headers.get("content-type") || "image/jpeg"
    let buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength < 100) {
      console.error(`[PDF] Image too small (${buf.byteLength} bytes) — ${url}`)
      return null
    }

    // react-pdf only supports PNG and JPEG — convert WebP (and any other format) to PNG
    if (contentType.includes("webp") || !contentType.includes("png") && !contentType.includes("jpeg") && !contentType.includes("jpg")) {
      console.log(`[PDF] Converting ${contentType} → PNG for: ${url}`)
      buf = await sharp(buf).png().toBuffer() as Buffer
    }

    const finalType = contentType.includes("jpeg") || contentType.includes("jpg") ? "image/jpeg" : "image/png"
    console.log(`[PDF] Image ready: ${url} (${buf.byteLength} bytes, ${finalType})`)
    return `data:${finalType};base64,${buf.toString("base64")}`
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

  const photoUrls: string[] = (report.photo_urls as string[]) || []
  // Default all photos to visible if photo_visible is null/empty (matches estimate page behavior)
  const photoVisible: boolean[] = (report.photo_visible as boolean[])?.length
    ? (report.photo_visible as boolean[])
    : photoUrls.map(() => true)

  const logoUrl = profile.logo_url || (report.logo_url as string) || ""
  const captions: string[] = (report.photo_captions as string[]) || []

  // Build list of visible photo URLs with captions
  const visiblePhotoData = photoUrls
    .map((url, i) => ({ url, caption: captions[i] || "" }))
    .filter((_, i) => photoUrls[i] && photoVisible[i])

  console.log(`[PDF] Generating proposal — logo: ${logoUrl || "(none)"}, photos: ${visiblePhotoData.length}`)

  // Fetch all images in parallel and convert to base64 data URIs
  const [logoDataUri, ...photoDataUris] = await Promise.all([
    fetchAsDataUri(logoUrl),
    ...visiblePhotoData.map((p) => fetchAsDataUri(p.url)),
  ])

  console.log(`[PDF] Logo data URI: ${logoDataUri ? `${logoDataUri.length} chars` : "null"}`)
  console.log(`[PDF] Photo data URIs: ${photoDataUris.filter(Boolean).length}/${visiblePhotoData.length} succeeded`)

  // Build visible photos with data URIs, filtering out any that failed to fetch
  const visiblePhotos = visiblePhotoData
    .map((p, i) => ({ src: photoDataUris[i]!, caption: p.caption }))
    .filter((p) => p.src)

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
    photo_captions: captions,
    photo_visible: photoVisible,
    scope_of_work: (report.scope_of_work || "") as string,
    recommendations: (report.recommendations || "") as string,
    price_quote: (report.price_quote as number) || null,
    material: (report.material || "") as string,
    notes: (report.notes || "") as string,
    pricing_tiers: (report.pricing_tiers as ProposalData["pricing_tiers"]) || null,
    accepted_tier_index: (report.accepted_tier_index as number) ?? null,
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
      logoSrc: logoDataUri || undefined,
      visiblePhotos,
    }) as any
  )

  return Buffer.from(pdfBuffer)
}
