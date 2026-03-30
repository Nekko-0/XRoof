import { notFound } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import Script from "next/script"
import { Suspense } from "react"
import type { Metadata } from "next"
import LandingPageClient from "./landing-page-client"
import type { LandingPage, Branding } from "./landing-page-client"

/* ─── Supabase client (server-side, no session persistence) ─── */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
)

/* ─── Data fetcher ─── */

async function getPageData(slug: string): Promise<{ page: LandingPage; branding: Branding } | null> {
  const { data: page, error } = await supabase
    .from("landing_pages")
    .select(
      "id, contractor_id, title, subtitle, cta_text, hero_image_url, template, services, trust_badges, testimonials, city, stats, color_scheme, utm_source, utm_campaign, google_ads_id, google_ads_label, facebook_pixel_id, google_analytics_id, thank_you_heading, thank_you_message, redirect_url, alt_headline, pricing_tiers, includes_list, price_factors"
    )
    .eq("slug", slug)
    .eq("active", true)
    .single()

  if (error || !page) return null

  const { data: branding } = await supabase
    .from("profiles")
    .select(
      "company_name, logo_url, widget_color, phone, email, service_zips, widget_price_per_sqft, google_review_url, google_reviews_cache, licensed_insured_certified"
    )
    .eq("id", page.contractor_id)
    .single()

  if (!branding) return null

  return { page: page as LandingPage, branding: branding as Branding }
}

/* ─── Metadata ─── */

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) {
    return { title: "Page Not Found" }
  }

  const { page, branding } = data
  const companyName = branding.company_name || "Roofing Company"
  const title = page.city
    ? `${page.title} in ${page.city} | ${companyName}`
    : `${page.title} | ${companyName}`
  const description = page.subtitle || ""
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"}/lp/${slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: page.hero_image_url ? [{ url: page.hero_image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: page.hero_image_url ? [page.hero_image_url] : [],
    },
    robots: { index: true, follow: true },
  }
}

/* ─── Page component ─── */

export default async function LandingPageView({ params }: Props) {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) {
    notFound()
  }

  const { page, branding } = data
  const companyName = branding.company_name || "Roofing Company"
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://xroof.io"}/lp/${slug}`

  /* ─── JSON-LD structured data ─── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "RoofingContractor",
    name: companyName,
    url: pageUrl,
  }

  if (page.city) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: page.city,
    }
  }
  if (branding.phone) jsonLd.telephone = branding.phone
  if (branding.email) jsonLd.email = branding.email
  if (page.subtitle) jsonLd.description = page.subtitle

  return (
    <>
      {/* Preconnect hints */}
      {page.google_analytics_id && (
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      )}
      {page.google_ads_id && (
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      )}
      {page.facebook_pixel_id && (
        <link rel="preconnect" href="https://connect.facebook.net" />
      )}

      {/* JSON-LD Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      {/* Google Ads */}
      {page.google_ads_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${page.google_ads_id}`}
            strategy="afterInteractive"
          />
          <Script id="gads-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${page.google_ads_id}');
            `}
          </Script>
        </>
      )}

      {/* Facebook Pixel */}
      {page.facebook_pixel_id && (
        <Script id="fb-pixel-init" strategy="afterInteractive">
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
          `}
        </Script>
      )}

      {/* Client component */}
      <Suspense>
        <LandingPageClient page={page} branding={branding} slug={slug} />
      </Suspense>
    </>
  )
}
