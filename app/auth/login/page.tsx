'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20, textAlign: 'center' }}>
        <h1>📧 Check your email</h1>
        <p>We sent a magic link to <strong>{email}</strong>.</p>
        <p>Click the link to sign in instantly.</p>
        <button 
          onClick={() => setSent(false)} 
          style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer' }}
        >
          Resend
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
      <h1>Login to Blossom AI</h1>
      <p style={{ color: '#4b5563', marginBottom: 20 }}>Enter your email to receive a login link.</p>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>❌ {error}</div>}
      <form onSubmit={handleSendMagicLink}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 6, marginBottom: 12 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10, background: '#3b82f6', color: 'white', borderRadius: 6, border: 'none', fontSize: 16, cursor: 'pointer' }}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>
    </div>
  )
}