import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Practice Quiz Generator',
  description: 'Created by Amari Cross',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
