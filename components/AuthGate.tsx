'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabaseClient'

// Gate reaproveitado do padrão do provador digital: nada renderiza sem sessão
// real; a autorização de verdade é revalidada no servidor (RLS + Edge Function).
export default function AuthGate({
  children,
}: {
  children: (session: Session) => React.ReactNode
}) {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
      if (!data.session) router.replace('/login')
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (!newSession) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  if (!checked || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }
  return <>{children(session)}</>
}
