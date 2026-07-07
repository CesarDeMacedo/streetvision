'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'

type Props = {
  beforeUrl: string | null
  afterUrl: string | null
  emptyMessage?: string
}

// Split View do streetvision-mockup.html convertido em componente controlado:
// a posição do slider vive em useState e move o clip-path da imagem "depois".
export default function SplitView({ beforeUrl, afterUrl, emptyMessage }: Props) {
  const { t } = useI18n()
  const [pos, setPos] = useState(52)
  // proporção real da foto — o container acompanha para nunca cortar a imagem
  const [ratio, setRatio] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const beforeImgRef = useRef<HTMLImageElement>(null)

  function syncRatio(img: HTMLImageElement | null) {
    if (img && img.naturalWidth > 0) setRatio(img.naturalWidth / img.naturalHeight)
  }

  // imagens estáticas (ex: /demo) podem terminar de carregar antes da
  // hidratação — o onLoad nunca dispara; cobre esse caso via img.complete
  useEffect(() => {
    if (beforeImgRef.current?.complete) syncRatio(beforeImgRef.current)
  }, [beforeUrl])

  function updateFromClientX(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(2, Math.min(98, pct)))
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) updateFromClientX(e.clientX)
  }

  return (
    <div
      className="split"
      ref={containerRef}
      style={{ aspectRatio: ratio ?? 2, maxHeight: '70vh' }}
    >
      <div className="split-half split-before">
        {beforeUrl && (
          <img
            ref={beforeImgRef}
            src={beforeUrl}
            alt="Antes — situação atual"
            draggable={false}
            onLoad={(e) => syncRatio(e.currentTarget)}
          />
        )}
      </div>
      {afterUrl ? (
        <>
          <div className="split-half split-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
            <img src={afterUrl} alt="Depois — proposta" draggable={false} />
          </div>
          <div className="tag tag-before">{t('split.before')}</div>
          <div className="tag tag-after">{t('split.after')}</div>
          <div
            className="handle"
            style={{ left: `${pos}%` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          >
            <div className="handle-line" />
            <div className="handle-grip">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a0f1a" strokeWidth="2.5">
                <path d="M8 5l-5 7 5 7M16 5l5 7-5 7" />
              </svg>
            </div>
          </div>
        </>
      ) : (
        <div className="split-empty">{emptyMessage ?? t('project.emptyHint')}</div>
      )}
    </div>
  )
}
