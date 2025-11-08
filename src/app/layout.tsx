import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Abfertigung Rechner',
  description: 'Österreichischer Abfertigungsrechner',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        {children}
      </body>
    </html>
  )
}