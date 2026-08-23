'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(error.message)
        return
      }
      if (data.session) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    })
  }, [])

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>❌ {error}</div>
  }

  return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Logging you in...</div>
}