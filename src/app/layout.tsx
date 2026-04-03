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
  openGraph: {
    title: 'Codex — Game Studio OS',
    description: 'The complete OS for indie game studios',
    type: 'website',
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
      <body className="bg-bg text-white font-sans antialiased">{children}</body>
    </html>
  )
}
