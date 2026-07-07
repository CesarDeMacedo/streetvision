'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'

type Props = {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  rightPanel?: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({ title, subtitle, meta, rightPanel, children }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await getSupabase().auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="brand">
          <div className="brand-mark">SV</div>
          <div className="brand-name">
            STREETVISION<span>ENGAGEMENT AI</span>
          </div>
        </div>
        <nav className="nav">
          <Link href="/projects" className="nav-item active">
            <div className="dot" />
            Projetos
          </Link>
        </nav>
        <div className="nav-step-label">Sessão</div>
        <nav className="nav">
          <button type="button" className="nav-item" onClick={handleLogout}>
            <div className="dot" />
            Sair
          </button>
        </nav>
        <div className="sidebar-footer">
          Motor de imagem: Gemini 3 Pro Image (Nano Banana Pro) · via Supabase Edge Function
        </div>
      </div>

      <div>
        <div className="topbar">
          <div>
            <h1>{title}</h1>
            {subtitle && <div className="sub">{subtitle}</div>}
          </div>
          {meta && <div className="topbar-meta">{meta}</div>}
        </div>
        {rightPanel ? (
          <div className="main-grid">
            <div className="content">{children}</div>
            <div className="right-panel">{rightPanel}</div>
          </div>
        ) : (
          <div className="content">{children}</div>
        )}
      </div>
    </div>
  )
}
