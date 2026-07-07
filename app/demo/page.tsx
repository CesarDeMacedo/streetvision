'use client'

import Link from 'next/link'
import SplitView from '@/components/SplitView'
import LangSwitch from '@/components/LangSwitch'
import ThemeToggle from '@/components/ThemeToggle'
import { useI18n } from '@/lib/i18n'
import { SIMULATED_ELEMENT_KEYS, SIMULATED_STATS } from '@/lib/mockImpact'

// Demonstração pública para quem avalia o projeto sem criar conta
// (recrutadores/portfólio): conteúdo fixo pré-gerado servido de /public —
// sem auth, sem Edge Function, sem consumo de rate limit.
export default function DemoPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen px-6 py-8 flex justify-center">
      <div className="w-full" style={{ maxWidth: 980 }}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div className="brand" style={{ marginBottom: 0 }}>
            <div className="brand-mark">SV</div>
            <div className="brand-name">
              STREETVISION<span>ENGAGEMENT AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <ThemeToggle />
            <Link href="/login" className="export-btn" style={{ textDecoration: 'none' }}>
              {t('demo.login')}
            </Link>
          </div>
        </div>

        <div
          className="note flex items-start gap-3 mb-5"
          style={{ fontSize: 12.5, borderColor: 'rgba(59, 130, 246, 0.45)' }}
        >
          <span
            className="sim-badge"
            style={{
              color: 'var(--blue)',
              background: 'rgba(59, 130, 246, 0.12)',
              borderColor: 'rgba(59, 130, 246, 0.45)',
            }}
          >
            {t('demo.badge')}
          </span>
          <span>{t('demo.notice')}</span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">
                <span className="num">◐</span>
                {t('project.interactive.title')}
              </h2>
              <div className="panel-sub">{t('demo.subtitle')}</div>
            </div>
          </div>

          <SplitView beforeUrl="/demo/before.jpg" afterUrl="/demo/after.png" />

          <div className="flex items-center justify-between gap-2" style={{ marginTop: 14 }}>
            <div className="rp-title" style={{ margin: 0 }}>
              {t('impact.title')}
            </div>
            <span className="sim-badge">{t('sim.badge')}</span>
          </div>
          <div className="stat-row" style={{ marginTop: 8 }}>
            {SIMULATED_STATS.map((stat) => (
              <div key={stat.labelKey} className={`stat-box${stat.tone ? ` ${stat.tone}` : ''}`}>
                <div className="label">{t(stat.labelKey)}</div>
                <div className="value">{stat.valueKey ? t(stat.valueKey) : stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
            <h2 className="panel-title" style={{ margin: 0 }}>
              <span className="num">◑</span>
              {t('elements.title')}
            </h2>
            <span className="sim-badge">{t('sim.badge')}</span>
          </div>
          <div className="elements-list">
            {SIMULATED_ELEMENT_KEYS.map((key) => (
              <div key={key} className="element-row">
                <span className="check">✓</span> {t(key)}
              </div>
            ))}
          </div>
          <div className="note" style={{ marginTop: 14 }}>
            {t('impact.note')}
          </div>
        </div>

        <div className="flex justify-center" style={{ marginTop: 22 }}>
          <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
            {t('demo.cta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
