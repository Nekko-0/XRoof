import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import type { Metadata } from "next"

/* ─── Supabase client (server-side, no session persistence) ─── */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

/* ─── Data fetcher ─── */

async function getPageData(slug: string) {
  const { data: page, error } = await supabase
    .from("landing_pages")
    .select("id, contractor_id, city, slug")
    .eq("slug", slug)
    .eq("active", true)
    .single()

  if (error || !page) return null

  const { data: branding } = await supabase
    .from("profiles")
    .select("company_name, widget_color, phone, email")
    .eq("id", page.contractor_id)
    .single()

  if (!branding) return null

  return { page, branding }
}

/* ─── Metadata ─── */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) {
    return { title: "Page Not Found" }
  }

  const companyName = data.branding.company_name || "Roofing Company"

  return {
    title: `Terms of Service | ${companyName}`,
    robots: { index: false, follow: false },
  }
}

/* ─── Page component ─── */

export default async function TermsOfServicePage({ params }: Props) {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) {
    notFound()
  }

  const { page, branding } = data
  const companyName = branding.company_name || "Roofing Company"
  const contractorEmail = branding.email || ""
  const contractorPhone = branding.phone || ""
  const city = page.city || ""
  const accentColor = branding.widget_color || "#3b82f6"

  const now = new Date()
  const lastUpdated = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/lp/${slug}`}
          className="mb-8 inline-block text-sm underline-offset-4 hover:underline"
          style={{ color: accentColor }}
        >
          &larr; Back to page
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-white">Terms of Service</h1>
        <p className="mb-12 text-sm text-gray-400">Last updated: {lastUpdated}</p>

        <div className="space-y-8">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-lg font-semibold text-white">1. Acceptance</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              By using this website and submitting an estimate request, you agree to these Terms of
              Service.
            </p>
          </section>

          {/* 2. Estimate Requests */}
          <section>
            <h2 className="text-lg font-semibold text-white">2. Estimate Requests</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              Submitting an estimate request does not create a contract or obligation. Estimates
              provided are based on the information you supply and may change after an in-person
              inspection. All estimates are subject to the terms outlined in any subsequent contract
              between you and {companyName}.
            </p>
          </section>

          {/* 3. Communications Consent */}
          <section>
            <h2 className="text-lg font-semibold text-white">3. Communications Consent</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              By submitting the estimate form, you provide express written consent to be contacted
              by {companyName} via phone (including autodialed and prerecorded calls), email, and
              text message regarding your roofing project. This consent is not a condition of
              purchase. Message and data rates may apply. You may opt out of text messages by
              replying STOP at any time.
            </p>
          </section>

          {/* 4. Accuracy of Information */}
          <section>
            <h2 className="text-lg font-semibold text-white">4. Accuracy of Information</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              You agree to provide accurate and complete information when submitting an estimate
              request. {companyName} is not responsible for estimates based on inaccurate
              information.
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section>
            <h2 className="text-lg font-semibold text-white">5. Third-Party Services</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              This website is built and hosted using XRoof, a technology platform for roofing
              contractors. By using this website, you acknowledge that your submitted information
              will be processed by XRoof on behalf of {companyName}. XRoof&apos;s terms of service
              can be found at{" "}
              <a
                href="https://xroof.io/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
                style={{ color: accentColor }}
              >
                xroof.io/terms
              </a>
              .
            </p>
          </section>

          {/* 6. Limitation of Liability */}
          <section>
            <h2 className="text-lg font-semibold text-white">6. Limitation of Liability</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {companyName} and XRoof are not liable for any indirect, incidental, or consequential
              damages arising from the use of this website.
            </p>
          </section>

          {/* 7. Contact */}
          <section>
            <h2 className="text-lg font-semibold text-white">7. Contact</h2>
            <div className="mt-2 space-y-1 text-sm leading-relaxed text-gray-300">
              <p>{companyName}</p>
              {city && <p>{city}</p>}
              {contractorEmail && (
                <p>
                  <a
                    href={`mailto:${contractorEmail}`}
                    className="underline-offset-4 hover:underline"
                    style={{ color: accentColor }}
                  >
                    {contractorEmail}
                  </a>
                </p>
              )}
              {contractorPhone && (
                <p>
                  <a
                    href={`tel:${contractorPhone}`}
                    className="underline-offset-4 hover:underline"
                    style={{ color: accentColor }}
                  >
                    {contractorPhone}
                  </a>
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
