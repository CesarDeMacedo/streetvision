'use client'

import { DragEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGate from '@/components/AuthGate'
import AppShell from '@/components/AppShell'
import { getSupabase } from '@/lib/supabaseClient'
import { useI18n } from '@/lib/i18n'

function NewProjectForm({ userId }: { userId: string }) {
  const router = useRouter()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // preview imediato da foto selecionada/arrastada
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  function acceptFile(file: File | undefined) {
    if (file && file.type.startsWith('image/')) {
      setPhoto(file)
      setError(null)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!photo) {
      setError(t('newProject.photoRequired'))
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
      setError(insertError?.message ?? t('newProject.createFail'))
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
      setError(t('newProject.uploadFail', { msg: uploadError.message }))
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
    <AppShell title={t('newProject.title')} subtitle={t('newProject.subtitle')}>
      <form onSubmit={handleSubmit} className="panel flex flex-col gap-4 max-w-xl">
        <div className="field">
          <label>{t('newProject.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('newProject.namePh')}
            required
          />
        </div>
        <div className="field">
          <label>{t('newProject.address')}</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('newProject.addressPh')}
          />
        </div>
        <div className="field">
          <label>{t('newProject.photo')}</label>
          <div
            className={`dropzone${dragOver ? ' drag-over' : ''}`}
            style={{ minHeight: 110 }}
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={photo?.name ?? ''} className="preview" />
                <span>
                  {photo?.name} — {t('newProject.changePhoto')}
                </span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                </svg>
                {t('newProject.dropzone')}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
          </div>
        </div>

        {error && <p className="error-text m-0">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <div className="spinner" />}
          {saving ? t('newProject.creating') : t('newProject.submit')}
        </button>
      </form>
    </AppShell>
  )
}

export default function NewProjectPage() {
  return <AuthGate>{(session) => <NewProjectForm userId={session.user.id} />}</AuthGate>
}
