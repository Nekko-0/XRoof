import type { Metadata, Viewport } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ToastWrapper } from '@/components/toast-wrapper'
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
      </head>
      <body className={`${inter.variable} ${dmSans.variable} font-sans antialiased`}>
        <ToastWrapper>
          {children}
        </ToastWrapper>
        <Analytics />
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
