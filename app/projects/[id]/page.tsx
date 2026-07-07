'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import SplitView from '@/components/SplitView'
import { getSupabase } from '@/lib/supabaseClient'
import { LOCALES, useI18n } from '@/lib/i18n'
import { SIMULATED_ELEMENT_KEYS, SIMULATED_STATS } from '@/lib/mockImpact'
import { DAILY_GENERATION_LIMIT, type Project, type Visualization } from '@/lib/types'

const QUICK_CHIP_KEYS = ['bikeLane', 'trees', 'sidewalk', 'furniture'] as const

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function ProjectScreen({ userId }: { userId: string }) {
  const { t, lang } = useI18n()
  const { id: projectId } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [vizs, setVizs] = useState<Visualization[]>([])
  const [usedToday, setUsedToday] = useState(0)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [afterViz, setAfterViz] = useState<Visualization | null>(null)
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const loadAll = useCallback(async () => {
    const supabase = getSupabase()
    const [{ data: proj }, { data: vizRows }, { data: limitRow }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase
        .from('visualizations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
      supabase.from('generation_limits').select('date, count').eq('user_id', userId).maybeSingle(),
    ])
    if (!proj) {
      setNotFound(true)
      return
    }
    setProject(proj as Project)
    const list = (vizRows ?? []) as Visualization[]
    setVizs(list)
    setUsedToday(limitRow && limitRow.date === todayISO() ? limitRow.count : 0)

    if (proj.photo_path) {
      const { data } = await supabase.storage
        .from('street-photos')
        .createSignedUrl(proj.photo_path, 3600)
      setBeforeUrl(data?.signedUrl ?? null)
    }
    const latestDone = list.find((v) => v.status === 'done' && v.generated_image_path)
    if (latestDone) selectVisualization(latestDone)
  }, [projectId, userId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  async function selectVisualization(viz: Visualization) {
    if (!viz.generated_image_path) return
    setAfterViz(viz)
    const { data } = await getSupabase()
      .storage.from('generated-images')
      .createSignedUrl(viz.generated_image_path, 3600)
    setAfterUrl(data?.signedUrl ?? null)
  }

  function appendChip(text: string) {
    setPrompt((p) =>
      p.trim() ? `${p.trim().replace(/[.,]$/, '')}, ${text}` : `${t('chips.addPrefix')} ${text}`
    )
  }

  async function handleGenerate() {
    if (!project?.photo_path || generating) return
    if (usedToday >= DAILY_GENERATION_LIMIT) {
      setError(t('project.limitReachedLong', { n: DAILY_GENERATION_LIMIT }))
      return
    }
    setGenerating(true)
    setError(null)
    const supabase = getSupabase()

    const { data: viz, error: insertError } = await supabase
      .from('visualizations')
      .insert({
        project_id: project.id,
        original_photo_path: project.photo_path,
        prompt: prompt.trim(),
        status: 'pending',
      })
      .select()
      .single()
    if (insertError || !viz) {
      setError(insertError?.message ?? t('project.err.register'))
      setGenerating(false)
      return
    }

    try {
      const { data: photoBlob, error: downloadError } = await supabase.storage
        .from('street-photos')
        .download(project.photo_path)
      if (downloadError || !photoBlob) throw new Error(t('project.err.downloadOriginal'))

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error(t('project.err.session'))

      const form = new FormData()
      form.append('photo', photoBlob, 'street.jpg')
      form.append('description', prompt.trim())

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: form,
        }
      )
      if (!res.ok) {
        let message = t('project.err.http', { status: res.status })
        try {
          const body = await res.json()
          if (body.error) message = body.error
        } catch {
          /* resposta sem JSON */
        }
        throw new Error(message)
      }

      const imageBlob = await res.blob()
      const genPath = `${userId}/${project.id}/${viz.id}.png`
      const { error: uploadError } = await supabase.storage
        .from('generated-images')
        .upload(genPath, imageBlob, { contentType: imageBlob.type || 'image/png' })
      if (uploadError) throw new Error(t('project.err.saveGenerated', { msg: uploadError.message }))

      await supabase
        .from('visualizations')
        .update({ generated_image_path: genPath, status: 'done' })
        .eq('id', viz.id)
    } catch (err) {
      await supabase.from('visualizations').update({ status: 'failed' }).eq('id', viz.id)
      setError(err instanceof Error ? err.message : t('project.err.generic'))
    } finally {
      setGenerating(false)
      loadAll()
    }
  }

  async function handleDownload() {
    if (!afterViz?.generated_image_path) return
    const { data } = await getSupabase()
      .storage.from('generated-images')
      .createSignedUrl(afterViz.generated_image_path, 300)
    if (!data?.signedUrl) return
    const blob = await (await fetch(data.signedUrl)).blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `streetvision-${project?.name.replace(/\W+/g, '-').toLowerCase()}-${afterViz.id.slice(0, 8)}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (notFound) {
    return (
      <AppShell title={t('project.notFound.title')}>
        <div className="panel" style={{ color: 'var(--muted)' }}>
          {t('project.notFound.body')}
        </div>
      </AppShell>
    )
  }
  if (!project) {
    return (
      <AppShell title={t('project.loading')}>
        <div className="spinner" />
      </AppShell>
    )
  }

  const limitReached = usedToday >= DAILY_GENERATION_LIMIT

  return (
    <AppShell
      title={project.name}
      subtitle={project.address ?? undefined}
      meta={
        <div className="meta-item">
          {t('project.generationsToday')}
          <b>
            {usedToday} / {DAILY_GENERATION_LIMIT}
          </b>
        </div>
      }
      rightPanel={
        <>
          <div>
            <div className="rp-title">{t('export.title')}</div>
            <button
              className="export-btn w-full"
              onClick={handleDownload}
              disabled={!afterViz?.generated_image_path}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15V3M12 15l-4-4M12 15l4-4M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
              </svg>
              {t('export.download')}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: 10 }}>
              <div className="rp-title" style={{ margin: 0 }}>
                {t('elements.title')}
              </div>
              <span className="sim-badge">{t('sim.badge')}</span>
            </div>
            <div className="elements-list">
              {SIMULATED_ELEMENT_KEYS.map((key) => (
                <div key={key} className="element-row">
                  <span className="check">✓</span> {t(key)}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="rp-title">{t('impact.title')}</div>
            <div className="note">{t('impact.note')}</div>
          </div>
        </>
      }
    >
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">
              <span className="num">◐</span>
              {t('project.interactive.title')}
            </h2>
            <div className="panel-sub">{t('project.interactive.sub')}</div>
          </div>
        </div>

        <SplitView
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          emptyMessage={generating ? t('project.generatingHint') : t('project.emptyHint')}
        />

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

        <div className="gen-row">
          <div className="prompt-box">
            <label>{t('project.describe')}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('project.promptPh')}
            />
            <div className="chips">
              {QUICK_CHIP_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  onClick={() => appendChip(t(`chips.${key}.text`))}
                >
                  + {t(`chips.${key}.label`)}
                </button>
              ))}
            </div>
          </div>
          <div className="gen-btn">
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={generating || limitReached || !prompt.trim()}
            >
              {generating ? (
                <div className="spinner" />
              ) : (
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
                </svg>
              )}
              {generating ? t('project.generating') : t('project.generate')}
            </button>
            <div className="btn-cost">
              {limitReached
                ? t('project.limitReachedShort', { n: DAILY_GENERATION_LIMIT })
                : t('project.cost')}
            </div>
          </div>
        </div>
        {error && (
          <p className="error-text" style={{ marginTop: 10, marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            <span className="num">◑</span>
            {t('history.title')}
          </h2>
        </div>
        {vizs.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            {t('history.empty')}
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>{t('history.date')}</th>
                <th>{t('history.intervention')}</th>
                <th>{t('history.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vizs.map((v) => (
                <tr key={v.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(v.created_at).toLocaleString(LOCALES[lang], {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{v.prompt.length > 80 ? `${v.prompt.slice(0, 80)}…` : v.prompt}</td>
                  <td>
                    <span className={`status-badge status-${v.status}`}>
                      {t(`status.${v.status}`)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {v.status === 'done' && (
                      <button
                        className="link-btn"
                        onClick={() => selectVisualization(v)}
                        disabled={afterViz?.id === v.id}
                        style={afterViz?.id === v.id ? { color: 'var(--muted)' } : undefined}
                      >
                        {afterViz?.id === v.id ? t('history.showing') : t('history.compare')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}

export default function ProjectPage() {
  return <AuthGate>{(session) => <ProjectScreen userId={session.user.id} />}</AuthGate>
}
