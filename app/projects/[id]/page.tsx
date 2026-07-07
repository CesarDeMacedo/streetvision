'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import SplitView from '@/components/SplitView'
import { getSupabase } from '@/lib/supabaseClient'
import { DAILY_GENERATION_LIMIT, type Project, type Visualization } from '@/lib/types'

const QUICK_CHIPS = [
  { label: 'Ciclovia protegida', text: 'ciclovia protegida com canteiro separador' },
  { label: 'Arborização', text: 'arborização com árvores nativas' },
  { label: 'Calçada alargada', text: 'calçada alargada' },
  { label: 'Mobiliário urbano', text: 'mobiliário urbano (bancos e paraciclos)' },
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function ProjectScreen({ userId }: { userId: string }) {
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
    setPrompt((p) => (p.trim() ? `${p.trim().replace(/[.,]$/, '')}, ${text}` : `Adicionar ${text}`))
  }

  async function handleGenerate() {
    if (!project?.photo_path || generating) return
    if (usedToday >= DAILY_GENERATION_LIMIT) {
      setError(`Limite diário de ${DAILY_GENERATION_LIMIT} gerações atingido. Volte amanhã.`)
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
      setError(insertError?.message ?? 'Falha ao registrar a visualização.')
      setGenerating(false)
      return
    }

    try {
      const { data: photoBlob, error: downloadError } = await supabase.storage
        .from('street-photos')
        .download(project.photo_path)
      if (downloadError || !photoBlob) throw new Error('Falha ao baixar a foto original.')

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada — faça login novamente.')

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
        let message = `Falha na geração (HTTP ${res.status}).`
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
      if (uploadError) throw new Error(`Falha ao salvar a imagem gerada: ${uploadError.message}`)

      await supabase
        .from('visualizations')
        .update({ generated_image_path: genPath, status: 'done' })
        .eq('id', viz.id)
    } catch (err) {
      await supabase.from('visualizations').update({ status: 'failed' }).eq('id', viz.id)
      setError(err instanceof Error ? err.message : 'Falha ao gerar a visualização.')
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
      <AppShell title="Projeto não encontrado">
        <div className="panel" style={{ color: 'var(--muted)' }}>
          Este projeto não existe ou não pertence à sua conta.
        </div>
      </AppShell>
    )
  }
  if (!project) {
    return (
      <AppShell title="Carregando…">
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
        <>
          <div className="meta-item">
            GERAÇÕES HOJE
            <b>
              {usedToday} / {DAILY_GENERATION_LIMIT}
            </b>
          </div>
        </>
      }
      rightPanel={
        <>
          <div>
            <div className="rp-title">Exportar</div>
            <button
              className="export-btn w-full"
              onClick={handleDownload}
              disabled={!afterViz?.generated_image_path}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 15V3M12 15l-4-4M12 15l4-4M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
              </svg>
              Baixar imagem gerada
            </button>
          </div>
          <div>
            <div className="rp-title">Impacto Estimado</div>
            <div className="note">
              Placeholder ilustrativo — no MVP as métricas de impacto (capacidade, área verde) não
              são calculadas; em produção viriam de dados reais do projeto.
            </div>
          </div>
        </>
      }
    >
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">
              <span className="num">◐</span>Experiência Interativa
            </h2>
            <div className="panel-sub">
              Arraste para comparar o cenário atual com a intervenção proposta
            </div>
          </div>
        </div>

        <SplitView
          beforeUrl={beforeUrl}
          afterUrl={afterUrl}
          emptyMessage={
            generating
              ? 'Gerando visualização… (pode levar em torno de 30s)'
              : 'Descreva a intervenção abaixo e clique em Gerar Visualização.'
          }
        />

        <div className="gen-row">
          <div className="prompt-box">
            <label>Descrever a intervenção</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="ex: remover duas faixas de carro, adicionar ciclovia protegida com canteiro, alargar calçada e plantar árvores nativas"
            />
            <div className="chips">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  className="chip"
                  onClick={() => appendChip(chip.text)}
                >
                  + {chip.label}
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
              {generating ? 'Gerando…' : 'Gerar Visualização'}
            </button>
            <div className="btn-cost">
              {limitReached
                ? `Limite diário de ${DAILY_GENERATION_LIMIT} atingido`
                : '~US$0,13 · Gemini 3 Pro Image'}
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
            <span className="num">◑</span>Histórico de Visualizações
          </h2>
        </div>
        {vizs.length === 0 ? (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            Nenhuma visualização gerada neste projeto ainda.
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Intervenção</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vizs.map((v) => (
                <tr key={v.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {new Date(v.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>{v.prompt.length > 80 ? `${v.prompt.slice(0, 80)}…` : v.prompt}</td>
                  <td>
                    <span className={`status-badge status-${v.status}`}>
                      {v.status === 'done' ? 'concluída' : v.status === 'failed' ? 'falhou' : 'pendente'}
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
                        {afterViz?.id === v.id ? 'exibindo' : 'comparar'}
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
