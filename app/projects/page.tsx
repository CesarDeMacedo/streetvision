'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import { getSupabase } from '@/lib/supabaseClient'
import { LOCALES, useI18n } from '@/lib/i18n'
import type { Project } from '@/lib/types'

function ProjectList() {
  const { t, lang } = useI18n()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSupabase()
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProjects(data as Project[])
      })
  }, [])

  return (
    <AppShell
      title={t('projects.title')}
      subtitle={t('projects.subtitle')}
      meta={
        <Link href="/projects/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          {t('projects.new')}
        </Link>
      }
    >
      {error && <p className="error-text">{error}</p>}
      {!projects && !error && <div className="spinner" />}
      {projects && projects.length === 0 && (
        <div className="panel text-center" style={{ color: 'var(--muted)' }}>
          {t('projects.empty')}
        </div>
      )}
      <div className="flex flex-col gap-3">
        {projects?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[14px]">{p.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {p.address || t('projects.noAddress')}
                </div>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {new Date(p.created_at).toLocaleDateString(LOCALES[lang])}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}

export default function ProjectsPage() {
  return <AuthGate>{() => <ProjectList />}</AuthGate>
}
