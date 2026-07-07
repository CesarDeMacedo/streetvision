import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-grotesk',
})

export const metadata: Metadata = {
  title: 'StreetVision AI',
  description:
    'Visualizações fotorrealistas antes/depois de intervenções urbanas para consulta pública',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: extensões de navegador (ex: Grammarly) injetam
          atributos no <body> antes da hidratação; só silencia atributos deste elemento */}
      <body className={`${inter.variable} ${grotesk.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
