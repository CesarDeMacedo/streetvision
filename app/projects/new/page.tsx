'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import { getSupabase } from '@/lib/supabaseClient'

function NewProjectForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!photo) {
      setError('Selecione uma foto do local.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = getSupabase()

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({ user_id: userId, name, address: address || null })
      .select()
      .single()
    if (insertError || !project) {
      setError(insertError?.message ?? 'Falha ao criar o projeto.')
      setSaving(false)
      return
    }

    const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
    const photoPath = `${userId}/${project.id}/original-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('street-photos')
      .upload(photoPath, photo, { contentType: photo.type || 'image/jpeg' })
    if (uploadError) {
      // sem a foto o projeto não serve para nada — desfaz a criação
      await supabase.from('projects').delete().eq('id', project.id)
      setError(`Falha no upload da foto: ${uploadError.message}`)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({ photo_path: photoPath })
      .eq('id', project.id)
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push(`/projects/${project.id}`)
  }

  return (
    <AppShell title="Novo Projeto" subtitle="Nome do local, endereço e foto atual">
      <form onSubmit={handleSubmit} className="panel flex flex-col gap-4 max-w-xl">
        <div className="field">
          <label>Nome do local</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: St. Paul St & Church St"
            required
          />
        </div>
        <div className="field">
          <label>Endereço</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ex: St. Catharines, ON"
          />
        </div>
        <div className="field">
          <label>Foto do local</label>
          <label className="dropzone" style={{ minHeight: 110 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
            </svg>
            {photo ? photo.name : 'Clique para selecionar a foto (Street View ou câmera)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="error-text m-0">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <div className="spinner" />}
          {saving ? 'Criando…' : 'Criar Projeto'}
        </button>
      </form>
    </AppShell>
  )
}

export default function NewProjectPage() {
  return <AuthGate>{(session) => <NewProjectForm userId={session.user.id} />}</AuthGate>
}
