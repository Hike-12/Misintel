// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Misintel - AI-Powered Misinformation Detector',
  description: 'Combat misinformation with advanced AI verification. Verify news articles, detect deepfakes, and identify false information using multiple trusted sources.',
  keywords: 'fact check, misinformation, fake news, AI verification, truth guard',
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
      <body className={inter.className}>{children}</body>
    </html>
  )
}