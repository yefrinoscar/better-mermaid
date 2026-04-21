import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Sora } from 'next/font/google'
import type { ReactNode } from 'react'
import { AppThemeProvider } from '@/components/app-theme-provider'
import { getThemeInitializationScript } from '@/lib/app-themes'
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
}

export const viewport: Viewport = {
  themeColor: '#f5f5f5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} ${ibmPlexMono.variable}`}>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeInitializationScript() }}
        />
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  )
}
