import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EduPulse — AI Classroom Engagement Analytics',
  description: 'Real-time AI-powered engagement analytics for modern classrooms. Measure attention, score engagement, and transform teaching.',
  keywords: ['classroom analytics', 'engagement tracking', 'AI education', 'attention detection', 'EdTech'],
  openGraph: {
    title: 'EduPulse — Feel the Pulse of Every Classroom',
    description: 'Real-time AI engagement analytics that transforms how teachers understand their students.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="noise-overlay antialiased">
        {children}
      </body>
    </html>
  )
}