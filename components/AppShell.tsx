'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import LangSwitch from '@/components/LangSwitch'

type Props = {
  title: string
  subtitle?: string
  meta?: React.ReactNode
  rightPanel?: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({ title, subtitle, meta, rightPanel, children }: Props) {
  const router = useRouter()
  const { t } = useI18n()

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
            {t('nav.projects')}
          </Link>
        </nav>
        <div className="nav-step-label">{t('nav.language')}</div>
        <div style={{ padding: '0 10px' }}>
          <LangSwitch />
        </div>
        <div className="nav-step-label">{t('nav.session')}</div>
        <nav className="nav">
          <button type="button" className="nav-item" onClick={handleLogout}>
            <div className="dot" />
            {t('nav.logout')}
          </button>
        </nav>
        <div className="sidebar-footer">{t('footer.engine')}</div>
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
