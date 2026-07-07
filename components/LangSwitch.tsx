'use client'

import { LANGS, useI18n } from '@/lib/i18n'

export default function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="segmented" role="group" aria-label="Language">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={code === lang ? 'active' : undefined}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
