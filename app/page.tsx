'use client'

import Link from 'next/link'
import SplitView from '@/components/SplitView'
import LangSwitch from '@/components/LangSwitch'
import ThemeToggle from '@/components/ThemeToggle'
import { useI18n } from '@/lib/i18n'

const STEP_KEYS = ['step1', 'step2', 'step3'] as const

export default function LandingPage() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen px-6 py-8 flex justify-center">
      <div className="w-full flex flex-col" style={{ maxWidth: 1020 }}>
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
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

        <div className="text-center mx-auto" style={{ maxWidth: 720 }}>
          <h1 className="m-0" style={{ fontSize: 34, lineHeight: 1.2 }}>
            {t('landing.title')}
          </h1>
          <p
            className="mt-4 mb-0"
            style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6 }}
          >
            {t('landing.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: 24 }}>
            <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
              {t('landing.ctaSignup')}
            </Link>
            <Link href="/demo" className="export-btn" style={{ textDecoration: 'none', padding: '12px 20px' }}>
              {t('landing.ctaDemo')}
            </Link>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 36 }}>
          <SplitView beforeUrl="/demo/before.jpg" afterUrl="/demo/after.png" />
          <div
            className="text-center mt-3 mb-0 text-[12px]"
            style={{ color: 'var(--muted)' }}
          >
            {t('landing.previewCaption')}
          </div>
        </div>

        <h2 className="text-center m-0" style={{ fontSize: 20, marginTop: 44 }}>
          {t('landing.how')}
        </h2>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 18 }}
        >
          {STEP_KEYS.map((step, i) => (
            <div key={step} className="panel" style={{ marginTop: 0 }}>
              <h3 className="panel-title m-0">
                <span className="num">{i + 1}</span>
                {t(`landing.${step}.title`)}
              </h3>
              <p className="mb-0 mt-2 text-[12.5px]" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                {t(`landing.${step}.desc`)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap" style={{ marginTop: 36 }}>
          <Link href="/login" className="btn-primary" style={{ textDecoration: 'none' }}>
            {t('landing.ctaSignup')}
          </Link>
          <Link href="/demo" className="export-btn" style={{ textDecoration: 'none', padding: '12px 20px' }}>
            {t('landing.ctaDemo')}
          </Link>
        </div>

        <div
          className="text-center text-[11px]"
          style={{
            color: 'var(--muted)',
            marginTop: 48,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          {t('landing.footer')}
        </div>
      </div>
    </div>
  )
}
