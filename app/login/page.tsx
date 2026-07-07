'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'
import LangSwitch from '@/components/LangSwitch'
import ThemeToggle from '@/components/ThemeToggle'

type Mode = 'login' | 'signup'

// Fluxo de autenticação reaproveitado do Auth.tsx do provador digital,
// re-estilizado para a identidade escura do mockup.
export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  useEffect(() => {
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session) router.replace('/projects')
      })
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = getSupabase()

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      setCheckEmail(true)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    router.replace('/projects')
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col gap-7">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="brand"
            style={{ marginBottom: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <div className="brand-mark">SV</div>
            <div className="brand-name">
              STREETVISION<span>ENGAGEMENT AI</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>

        {checkEmail ? (
          <div className="panel flex flex-col gap-4 text-center">
            <h1 className="text-lg m-0">{t('login.checkEmail.title')}</h1>
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              {t('login.checkEmail.body', { email })}
            </p>
            <button
              className="btn-primary"
              onClick={() => {
                setCheckEmail(false)
                setMode('login')
              }}
            >
              {t('login.checkEmail.back')}
            </button>
          </div>
        ) : (
          <div className="panel">
            <h1 className="text-lg mt-0 mb-1">{t(`login.title.${mode}`)}</h1>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
              {t(`login.sub.${mode}`)}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div className="field">
                  <label>{t('login.fullName')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="field">
                <label>{t('login.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>{t('login.password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="error-text m-0">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary">
                {loading && <div className="spinner" />}
                {loading ? t('login.wait') : t(`login.submit.${mode}`)}
              </button>
            </form>
            <button
              onClick={switchMode}
              className="link-btn mt-4"
              style={{ color: 'var(--muted)' }}
            >
              {mode === 'login' ? t('login.switch.toSignup') : t('login.switch.toLogin')}
            </button>
          </div>
        )}

        <Link
          href="/demo"
          className="text-center text-[12.5px]"
          style={{ color: 'var(--blue)', textDecoration: 'none' }}
        >
          {t('login.viewDemo')}
        </Link>
      </div>
    </div>
  )
}
