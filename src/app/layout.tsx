// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MisIntel',
  description: 'Combat misinformation with advanced AI verification. Verify news articles, detect deepfakes, and identify false information using multiple trusted sources.',
  keywords: 'fact check, misinformation, fake news, AI verification, misintel',
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Misintel - AI-Powered Misinformation Detector',
    description: 'Combat misinformation with advanced AI verification',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Misintel - AI-Powered Misinformation Detector', 
    description: 'Combat misinformation with advanced AI verification',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MisIntel" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}