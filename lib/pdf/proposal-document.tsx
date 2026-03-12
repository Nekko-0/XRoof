import React from "react"
import { Document, Page, View, Text, Image } from "@react-pdf/renderer"
import { createProposalStyles } from "./styles"

interface PricingTier {
  name: string
  description: string
  price: number | null
}

interface EstimateLineItem {
  description: string
  quantity: number
  unit_price: number
}

interface EdgeTotals {
  eaves?: number
  rakes?: number
  ridges?: number
  valleys?: number
  hips?: number
}

export interface ProposalData {
  // Company
  company_name: string
  company_email: string
  company_phone: string
  logo_url: string
  business_address?: string
  license_number?: string
  // Customer
  customer_name: string
  customer_address: string
  customer_phone: string
  job_type: string
  // Roof
  roof_squares: number | null
  roof_pitch: string
  measurement_data?: { edge_totals?: EdgeTotals; total_area?: number }
  // Photos
  photo_urls: string[]
  photo_captions: string[]
  photo_visible: boolean[]
  // Content
  scope_of_work: string
  recommendations: string
  price_quote: number | null
  material: string
  notes: string
  // Pricing
  pricing_tiers: PricingTier[] | null
  deposit_percent: number | null
  estimate_line_items: EstimateLineItem[] | null
  // Prepared by
  worker_name: string
  worker_title: string
  worker_phone: string
  // Materials
  materials_visible: boolean
  materials_data?: {
    shingle_bundles?: number
    underlayment_rolls?: number
    drip_edge_pcs?: number
    ridge_cap_bundles?: number
    starter_rolls?: number
    nail_boxes?: number
    ice_shield_rolls?: number
  }
}

interface ProposalDocumentProps {
  data: ProposalData
  primaryColor: string
  logoBuffer?: Buffer | null
  photoBuffers: (Buffer | null)[]
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDollars(dollars: number): string {
  return "$" + dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatFt(ft: number): string {
  return `${Math.round(ft)} ft`
}

// Header rendered on every page (except cover)
function PageHeader({ companyName, logoBuffer, styles }: { companyName: string; logoBuffer?: Buffer | null; styles: ReturnType<typeof createProposalStyles> }) {
  return (
    <View style={styles.header} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {logoBuffer && <Image style={styles.headerLogo} src={{ data: logoBuffer, format: "png" }} />}
        <Text style={styles.headerCompany}>{companyName}</Text>
      </View>
      <Text style={styles.headerPageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
}

function PageFooter({ companyEmail, companyPhone, styles }: { companyEmail: string; companyPhone: string; styles: ReturnType<typeof createProposalStyles> }) {
  const parts = [companyEmail, companyPhone].filter(Boolean)
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{parts.join("  |  ")}{parts.length > 0 ? "  |  " : ""}Powered by XRoof</Text>
    </View>
  )
}

export function ProposalDocument({ data, primaryColor, logoBuffer, photoBuffers }: ProposalDocumentProps) {
  const s = createProposalStyles(primaryColor)
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  // Visible photos
  const visiblePhotos: { buffer: Buffer; caption: string }[] = []
  data.photo_urls.forEach((url, i) => {
    if (url && data.photo_visible[i] && photoBuffers[i]) {
      visiblePhotos.push({ buffer: photoBuffers[i]!, caption: data.photo_captions[i] || "" })
    }
  })

  // Edge totals
  const edges = data.measurement_data?.edge_totals
  const hasEdges = edges && (edges.eaves || edges.rakes || edges.ridges || edges.valleys || edges.hips)

  // Line items
  const lineItems = data.estimate_line_items?.filter((li) => li.description) || []
  const lineItemTotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)

  // Pricing tiers
  const tiers = data.pricing_tiers?.filter((t) => t.name && t.price != null) || []

  return (
    <Document title={`Roofing Proposal - ${data.customer_name}`} author={data.company_name}>
      {/* ===== COVER PAGE ===== */}
      <Page size="A4" style={s.coverPage}>
        {logoBuffer && <Image style={s.coverLogo} src={{ data: logoBuffer, format: "png" }} />}
        <Text style={s.coverCompany}>{data.company_name}</Text>
        <Text style={s.coverTitle}>ROOFING PROPOSAL</Text>
        <View style={s.coverDivider} />

        <Text style={s.coverInfoLabel}>Prepared For</Text>
        <Text style={s.coverInfoValue}>{data.customer_name || "Homeowner"}</Text>

        <Text style={s.coverInfoLabel}>Property Address</Text>
        <Text style={s.coverInfoValue}>{data.customer_address || "—"}</Text>

        {data.job_type ? (
          <>
            <Text style={s.coverInfoLabel}>Project Type</Text>
            <Text style={s.coverInfoValue}>{data.job_type}</Text>
          </>
        ) : null}

        <Text style={s.coverDate}>{today}</Text>
        {data.worker_name ? (
          <Text style={s.coverPreparedBy}>
            Prepared by {data.worker_name}{data.worker_title ? `, ${data.worker_title}` : ""}
          </Text>
        ) : null}
        {data.business_address ? <Text style={s.coverPreparedBy}>{data.business_address}</Text> : null}
        {data.license_number ? <Text style={s.coverPreparedBy}>License #{data.license_number}</Text> : null}
      </Page>

      {/* ===== PROPERTY DETAILS + MEASUREMENTS ===== */}
      <Page size="A4" style={s.page}>
        <PageHeader companyName={data.company_name} logoBuffer={logoBuffer} styles={s} />
        <PageFooter companyEmail={data.company_email} companyPhone={data.company_phone} styles={s} />

        <Text style={s.sectionTitle}>Property Details</Text>

        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Customer</Text>
          <Text style={s.infoValue}>{data.customer_name}</Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Address</Text>
          <Text style={s.infoValue}>{data.customer_address}</Text>
        </View>
        {data.customer_phone ? (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Phone</Text>
            <Text style={s.infoValue}>{data.customer_phone}</Text>
          </View>
        ) : null}
        {data.job_type ? (
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Project Type</Text>
            <Text style={s.infoValue}>{data.job_type}</Text>
          </View>
        ) : null}

        {/* Roof Measurements */}
        {(data.roof_squares || data.roof_pitch || hasEdges) ? (
          <>
            <Text style={s.sectionSubtitle}>Roof Measurements</Text>
            <View style={s.measurementGrid}>
              {data.roof_squares ? (
                <View style={s.measurementCard}>
                  <Text style={s.measurementLabel}>Squares</Text>
                  <Text style={s.measurementValue}>{data.roof_squares}</Text>
                </View>
              ) : null}
              {data.measurement_data?.total_area ? (
                <View style={s.measurementCard}>
                  <Text style={s.measurementLabel}>Total Area</Text>
                  <Text style={s.measurementValue}>{Math.round(data.measurement_data.total_area)} sqft</Text>
                </View>
              ) : null}
              {data.roof_pitch ? (
                <View style={s.measurementCard}>
                  <Text style={s.measurementLabel}>Pitch</Text>
                  <Text style={s.measurementValue}>{data.roof_pitch}</Text>
                </View>
              ) : null}
            </View>

            {hasEdges ? (
              <>
                <Text style={s.sectionSubtitle}>Edge Measurements</Text>
                <View style={s.table}>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, { width: "50%" }]}>Edge Type</Text>
                    <Text style={[s.tableHeaderCell, { width: "50%", textAlign: "right" }]}>Length</Text>
                  </View>
                  {edges!.eaves ? (
                    <View style={s.tableRow}>
                      <Text style={[s.tableCell, { width: "50%" }]}>Eaves</Text>
                      <Text style={[s.tableCell, { width: "50%", textAlign: "right" }]}>{formatFt(edges!.eaves)}</Text>
                    </View>
                  ) : null}
                  {edges!.rakes ? (
                    <View style={s.tableRowAlt}>
                      <Text style={[s.tableCell, { width: "50%" }]}>Rakes</Text>
                      <Text style={[s.tableCell, { width: "50%", textAlign: "right" }]}>{formatFt(edges!.rakes)}</Text>
                    </View>
                  ) : null}
                  {edges!.ridges ? (
                    <View style={s.tableRow}>
                      <Text style={[s.tableCell, { width: "50%" }]}>Ridges</Text>
                      <Text style={[s.tableCell, { width: "50%", textAlign: "right" }]}>{formatFt(edges!.ridges)}</Text>
                    </View>
                  ) : null}
                  {edges!.valleys ? (
                    <View style={s.tableRowAlt}>
                      <Text style={[s.tableCell, { width: "50%" }]}>Valleys</Text>
                      <Text style={[s.tableCell, { width: "50%", textAlign: "right" }]}>{formatFt(edges!.valleys)}</Text>
                    </View>
                  ) : null}
                  {edges!.hips ? (
                    <View style={s.tableRow}>
                      <Text style={[s.tableCell, { width: "50%" }]}>Hips</Text>
                      <Text style={[s.tableCell, { width: "50%", textAlign: "right" }]}>{formatFt(edges!.hips)}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </Page>

      {/* ===== PHOTO GALLERY (conditional) ===== */}
      {visiblePhotos.length > 0 ? (
        <Page size="A4" style={s.page}>
          <PageHeader companyName={data.company_name} logoBuffer={logoBuffer} styles={s} />
          <PageFooter companyEmail={data.company_email} companyPhone={data.company_phone} styles={s} />

          <Text style={s.sectionTitle}>Property Photos</Text>
          <View style={s.photoGrid}>
            {visiblePhotos.map((photo, i) => (
              <View key={i} style={s.photoContainer}>
                <Image style={s.photo} src={{ data: photo.buffer, format: "png" }} />
                {photo.caption ? <Text style={s.photoCaption}>{photo.caption}</Text> : null}
              </View>
            ))}
          </View>
        </Page>
      ) : null}

      {/* ===== SCOPE OF WORK + MATERIALS ===== */}
      {(data.scope_of_work || data.material) ? (
        <Page size="A4" style={s.page}>
          <PageHeader companyName={data.company_name} logoBuffer={logoBuffer} styles={s} />
          <PageFooter companyEmail={data.company_email} companyPhone={data.company_phone} styles={s} />

          {data.scope_of_work ? (
            <>
              <Text style={s.sectionTitle}>Scope of Work</Text>
              <Text style={s.paragraph}>{data.scope_of_work}</Text>
            </>
          ) : null}

          {data.material ? (
            <>
              <Text style={s.sectionSubtitle}>Materials</Text>
              <Text style={s.paragraph}>{data.material}</Text>
            </>
          ) : null}

          {/* Materials breakdown table */}
          {data.materials_visible && data.materials_data ? (
            <>
              <Text style={s.sectionSubtitle}>Material Quantities</Text>
              <View style={s.table}>
                <View style={s.tableHeader}>
                  <Text style={[s.tableHeaderCell, { width: "60%" }]}>Material</Text>
                  <Text style={[s.tableHeaderCell, { width: "40%", textAlign: "right" }]}>Quantity</Text>
                </View>
                {data.materials_data.shingle_bundles ? (
                  <View style={s.tableRow}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Shingle Bundles</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.shingle_bundles}</Text>
                  </View>
                ) : null}
                {data.materials_data.underlayment_rolls ? (
                  <View style={s.tableRowAlt}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Underlayment Rolls</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.underlayment_rolls}</Text>
                  </View>
                ) : null}
                {data.materials_data.drip_edge_pcs ? (
                  <View style={s.tableRow}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Drip Edge (10ft pcs)</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.drip_edge_pcs}</Text>
                  </View>
                ) : null}
                {data.materials_data.ridge_cap_bundles ? (
                  <View style={s.tableRowAlt}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Ridge Cap Bundles</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.ridge_cap_bundles}</Text>
                  </View>
                ) : null}
                {data.materials_data.starter_rolls ? (
                  <View style={s.tableRow}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Starter Strip Rolls</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.starter_rolls}</Text>
                  </View>
                ) : null}
                {data.materials_data.nail_boxes ? (
                  <View style={s.tableRowAlt}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Nail Boxes</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.nail_boxes}</Text>
                  </View>
                ) : null}
                {data.materials_data.ice_shield_rolls ? (
                  <View style={s.tableRow}>
                    <Text style={[s.tableCell, { width: "60%" }]}>Ice & Water Shield Rolls</Text>
                    <Text style={[s.tableCell, { width: "40%", textAlign: "right" }]}>{data.materials_data.ice_shield_rolls}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </Page>
      ) : null}

      {/* ===== PRICING ===== */}
      {(lineItems.length > 0 || tiers.length > 0 || data.price_quote) ? (
        <Page size="A4" style={s.page}>
          <PageHeader companyName={data.company_name} logoBuffer={logoBuffer} styles={s} />
          <PageFooter companyEmail={data.company_email} companyPhone={data.company_phone} styles={s} />

          <Text style={s.sectionTitle}>Pricing</Text>

          {/* Line Items Table */}
          {lineItems.length > 0 ? (
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, { width: "45%" }]}>Description</Text>
                <Text style={[s.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Qty</Text>
                <Text style={[s.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Unit Price</Text>
                <Text style={[s.tableHeaderCell, { width: "20%", textAlign: "right" }]}>Total</Text>
              </View>
              {lineItems.map((li, i) => (
                <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                  <Text style={[s.tableCell, { width: "45%" }]}>{li.description}</Text>
                  <Text style={[s.tableCell, { width: "15%", textAlign: "right" }]}>{li.quantity}</Text>
                  <Text style={[s.tableCell, { width: "20%", textAlign: "right" }]}>{formatDollars(li.unit_price)}</Text>
                  <Text style={[s.tableCellBold, { width: "20%", textAlign: "right" }]}>{formatDollars(li.quantity * li.unit_price)}</Text>
                </View>
              ))}
              <View style={s.tableTotalRow}>
                <Text style={[s.tableTotalLabel, { width: "80%" }]}>Total Estimate</Text>
                <Text style={[s.tableTotalValue, { width: "20%", textAlign: "right" }]}>{formatDollars(lineItemTotal)}</Text>
              </View>
            </View>
          ) : null}

          {/* Pricing Tiers */}
          {tiers.length > 0 ? (
            <View style={s.tierContainer}>
              {tiers.map((tier, i) => (
                <View key={i} style={i === 1 ? s.tierCardPopular : s.tierCard}>
                  <Text style={s.tierName}>{tier.name}</Text>
                  {tier.description ? <Text style={s.tierDesc}>{tier.description}</Text> : null}
                  <Text style={s.tierPrice}>{tier.price != null ? formatDollars(tier.price) : "—"}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Single Price */}
          {!lineItems.length && !tiers.length && data.price_quote ? (
            <View style={s.priceBox}>
              <Text style={s.priceLabel}>Estimated Cost</Text>
              <Text style={s.priceValue}>{formatDollars(data.price_quote)}</Text>
            </View>
          ) : null}

          {/* Deposit */}
          {data.deposit_percent ? (
            <Text style={s.depositNote}>
              A deposit of {data.deposit_percent}% ({formatDollars(
                Math.round((lineItemTotal || data.price_quote || 0) * data.deposit_percent / 100)
              )}) is due upon acceptance.
            </Text>
          ) : null}
        </Page>
      ) : null}

      {/* ===== RECOMMENDATIONS, NOTES, TERMS ===== */}
      {(data.recommendations || data.notes) ? (
        <Page size="A4" style={s.page}>
          <PageHeader companyName={data.company_name} logoBuffer={logoBuffer} styles={s} />
          <PageFooter companyEmail={data.company_email} companyPhone={data.company_phone} styles={s} />

          {data.recommendations ? (
            <>
              <Text style={s.sectionTitle}>Recommendations</Text>
              <Text style={s.paragraph}>{data.recommendations}</Text>
            </>
          ) : null}

          {data.notes ? (
            <>
              <Text style={s.sectionSubtitle}>Additional Notes</Text>
              <Text style={s.paragraph}>{data.notes}</Text>
            </>
          ) : null}

          <View style={s.termsBox}>
            <Text style={[s.sectionSubtitle, { marginTop: 0 }]}>Terms & Conditions</Text>
            <Text style={s.termsText}>
              This proposal is valid for 30 days from the date above. Prices are subject to change if the scope of work changes after on-site inspection. All work is performed in accordance with local building codes and manufacturer specifications. Warranty coverage follows manufacturer guidelines. {data.company_name} carries full liability insurance and workers&apos; compensation coverage. Payment terms: {data.deposit_percent ? `${data.deposit_percent}% deposit due upon acceptance, balance due upon completion` : "Due upon completion of work"}. Any additional work beyond the scope described above will be quoted separately.
            </Text>
          </View>
        </Page>
      ) : null}
    </Document>
  )
}
