import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import Script from "next/script"
import Link from "next/link"
import { CheckCircle, Phone } from "lucide-react"
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
    .select(
      "id, contractor_id, slug, thank_you_heading, thank_you_message, google_ads_id, google_ads_label, facebook_pixel_id, google_analytics_id"
    )
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
    title: `Thank You | ${companyName}`,
    robots: { index: false, follow: false },
  }
}

/* ─── Page component ─── */

export default async function ThankYouPage({ params }: Props) {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) {
    notFound()
  }

  const { page, branding } = data
  const companyName = branding.company_name || "Roofing Company"
  const accentColor = branding.widget_color || "#3b82f6"
  const heading = page.thank_you_heading || "Estimate Request Received!"
  const message =
    page.thank_you_message ||
    "We'll review your project details and get back to you within 24 hours with a free, no-obligation estimate."

  return (
    <>
      {/* ─── Tracking Scripts ─── */}

      {/* Google Analytics */}
      {page.google_analytics_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${page.google_analytics_id}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${page.google_analytics_id}');
            `}
          </Script>
        </>
      )}

      {/* Google Ads — load gtag and auto-fire conversion */}
      {page.google_ads_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${page.google_ads_id}`}
            strategy="afterInteractive"
          />
          <Script id="gads-conversion" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${page.google_ads_id}');
              gtag('event', 'conversion', {
                'send_to': '${page.google_ads_id}/${page.google_ads_label || ""}'
              });
            `}
          </Script>
        </>
      )}

      {/* Facebook Pixel — auto-fire Lead event */}
      {page.facebook_pixel_id && (
        <Script id="fb-pixel-lead" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${page.facebook_pixel_id}');
            fbq('track', 'PageView');
            fbq('track', 'Lead');
          `}
        </Script>
      )}

      {/* ─── Page Content ─── */}
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <CheckCircle className="mx-auto mb-6 h-16 w-16" style={{ color: accentColor }} />

          <h1 className="mb-4 text-3xl font-bold text-white">{heading}</h1>

          <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-gray-300">{message}</p>

          {branding.phone && (
            <a
              href={`tel:${branding.phone}`}
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              <Phone className="h-4 w-4" />
              Call Us Now: {branding.phone}
            </a>
          )}

          <div className="mt-8">
            <Link
              href={`/lp/${slug}`}
              className="text-sm underline-offset-4 hover:underline"
              style={{ color: accentColor }}
            >
              &larr; Back to {companyName}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
