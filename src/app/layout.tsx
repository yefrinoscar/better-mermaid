import type { Metadata } from 'next'
import { IBM_Plex_Mono, Sora } from 'next/font/google'
import type { ReactNode } from 'react'
import './globals.css'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'Better Mermaid Dashboard',
  description: 'Compact Mermaid dashboard powered by beautiful-mermaid and Next.js 16.',
  icons: {
    icon: [{ url: '/chart-icon.svg', type: 'image/svg+xml' }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${ibmPlexMono.variable}`}>{children}</body>
    </html>
  )
}
