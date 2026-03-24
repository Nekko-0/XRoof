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
    title: `Privacy Policy | ${companyName}`,
    robots: { index: false, follow: false },
  }
}

/* ─── Page component ─── */

export default async function PrivacyPolicyPage({ params }: Props) {
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

        <h1 className="mb-2 text-3xl font-bold text-white">Privacy Policy</h1>
        <p className="mb-12 text-sm text-gray-400">Last updated: {lastUpdated}</p>

        <div className="space-y-8">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-lg font-semibold text-white">1. Introduction</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {companyName} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) values
              your privacy. This Privacy Policy explains how we collect and use information when you
              submit a form on our website.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-lg font-semibold text-white">2. Information We Collect</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              When you submit our estimate request form, we collect: your name, phone number, email
              address (if provided), property address, city, ZIP code, project type, and any project
              description you provide.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-lg font-semibold text-white">3. How We Use Your Information</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We use your information to:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-300">
              <li>Contact you about your roofing project</li>
              <li>Prepare and deliver an estimate</li>
              <li>Follow up on your project inquiry</li>
              <li>Send service-related communications</li>
            </ul>
          </section>

          {/* 4. How We Share Your Information */}
          <section>
            <h2 className="text-lg font-semibold text-white">4. How We Share Your Information</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We do not sell your personal information. Your data may be shared with:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm leading-relaxed text-gray-300">
              <li>
                Technology providers that help us operate our business (including XRoof, our
                business management platform)
              </li>
              <li>As required by law</li>
            </ul>
          </section>

          {/* 5. Communications */}
          <section>
            <h2 className="text-lg font-semibold text-white">5. Communications</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              By submitting our form, you consent to receive phone calls (including autodialed and
              prerecorded calls), emails, and text messages from {companyName} regarding your
              roofing project. Message and data rates may apply. Reply STOP to opt out of text
              messages at any time.
            </p>
          </section>

          {/* 6. Data Security */}
          <section>
            <h2 className="text-lg font-semibold text-white">6. Data Security</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              We implement reasonable security measures to protect your information. However, no
              method of electronic transmission is 100% secure.
            </p>
          </section>

          {/* 7. Your Rights */}
          <section>
            <h2 className="text-lg font-semibold text-white">7. Your Rights</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              You may request access to, correction of, or deletion of your personal information by
              contacting us at{" "}
              <a
                href={`mailto:${contractorEmail}`}
                className="underline-offset-4 hover:underline"
                style={{ color: accentColor }}
              >
                {contractorEmail}
              </a>
              .
            </p>
          </section>

          {/* 8. Contact */}
          <section>
            <h2 className="text-lg font-semibold text-white">8. Contact</h2>
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

          {/* XRoof attribution */}
          <section className="border-t border-gray-800 pt-6">
            <p className="text-sm leading-relaxed text-gray-400">
              This website is powered by XRoof. XRoof&apos;s privacy policy can be found at{" "}
              <a
                href="https://xroof.io/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline"
                style={{ color: accentColor }}
              >
                xroof.io/privacy
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
