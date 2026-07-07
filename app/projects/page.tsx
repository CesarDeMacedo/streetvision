'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import { getSupabase } from '@/lib/supabaseClient'
import type { Project } from '@/lib/types'

function ProjectList() {
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
      title="Projetos"
      subtitle="Locais e intersecções sendo visualizados"
      meta={
        <Link href="/projects/new" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo Projeto
        </Link>
      }
    >
      {error && <p className="error-text">{error}</p>}
      {!projects && !error && <div className="spinner" />}
      {projects && projects.length === 0 && (
        <div className="panel text-center" style={{ color: 'var(--muted)' }}>
          Nenhum projeto ainda. Crie o primeiro com nome, endereço e uma foto do local.
        </div>
      )}
      <div className="flex flex-col gap-3">
        {projects?.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="project-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[14px]">{p.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {p.address || 'Sem endereço'}
                </div>
              </div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                {new Date(p.created_at).toLocaleDateString('pt-BR')}
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
