import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ToastWrapper } from '@/components/toast-wrapper'
import { CookieConsent } from '@/components/cookie-consent'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: 'XRoof - Find Trusted Roofing Contractors',
  description: 'Post your roofing job and get connected with qualified contractors in your area. Fast, easy, and reliable.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'XRoof - Professional Roofing Contractor Platform',
    description: 'Manage leads, create estimates, send contracts, and collect payments — all in one platform built for roofing contractors.',
    siteName: 'XRoof',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'XRoof - Professional Roofing Contractor Platform',
    description: 'Manage leads, create estimates, send contracts, and collect payments — all in one platform built for roofing contractors.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XRoof',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        )}
        {process.env.NEXT_PUBLIC_GOOGLE_ADS_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}');
                `,
              }}
            />
          </>
        )}
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        <ToastWrapper>
          {children}
        </ToastWrapper>
        <Analytics />
        <CookieConsent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {})
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
