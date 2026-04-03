import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Mono, Unbounded } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', weight: ['300','400','500'] })
const dmMono = DM_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['300','400','500'] })
const unbounded = Unbounded({ subsets: ['latin'], variable: '--font-display', weight: ['400','600','700','900'] })

export const metadata: Metadata = {
  title: 'Codex — Game Studio OS',
  description: 'The complete operating system for indie game studios. GDD, decisions, budget, investors, team — all in one place.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Codex',
  },
  openGraph: {
    title: 'Codex — Game Studio OS',
    description: 'The complete OS for indie game studios',
    type: 'website',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable} ${unbounded.variable}`}>
      <head>
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-bg text-white font-sans antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </body>
    </html>
  )
}
