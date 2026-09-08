'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Deal {
  id: string
  brand_name: string
  product_name: string
  budget: number
  requirements: string
  status: string
  created_at: string
  brand_feedback?: string | null
  brand_feedback_comment?: string | null
}

interface CreatorDeal {
  deal: Deal
  creator_status: string
}

export default function ActivateClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const urlEmail = searchParams.get('email')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [inputEmail, setInputEmail] = useState('')
  const [activating, setActivating] = useState(false)
  const [activatedEmail, setActivatedEmail] = useState<string | null>(null)
  const [deals, setDeals] = useState<CreatorDeal[]>([])
  const [justActivatedDealId, setJustActivatedDealId] = useState<string | null>(null)
  const [quotedRate, setQuotedRate] = useState('')

  const getOrCreateProfile = async (email: string) => {
    const supabase = createClient()
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          email: email,
          full_name: email.split('@')[0],
        })
        .select('id')
        .single()
      if (insertError) throw new Error('Failed to create profile: ' + insertError.message)
      profile = newProfile
    }
    return profile.id
  }

  const fetchAllDeals = async (email: string) => {
    const supabase = createClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (profileError || !profile) return []

    const { data, error } = await supabase
      .from('deal_creators')
      .select(`
        status,
        deal:deals (
          id,
          brand_name,
          product_name,
          budget,
          requirements,
          status,
          created_at,
          brand_feedback,
          brand_feedback_comment
        )
      `)
      .eq('creator_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) return []

    return data.map((item: any) => ({
      deal: {
        id: item.deal.id,
        brand_name: item.deal.brand_name,
        product_name: item.deal.product_name,
        budget: item.deal.budget,
        requirements: item.deal.requirements,
        status: item.deal.status,
        created_at: item.deal.created_at,
        brand_feedback: item.deal.brand_feedback,
        brand_feedback_comment: item.deal.brand_feedback_comment
      },
      creator_status: item.status
    }))
  }

  const activateCampaign = async (email: string) => {
    if (!token) return
    setActivating(true)
    setError('')
    try {
      const supabase = createClient()

      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select('*')
        .eq('token', token)
        .single()
      if (dealError || !dealData) throw new Error('Campaign not found')

      const creatorId = await getOrCreateProfile(email)

      let { data: creator, error: creatorError } = await supabase
        .from('deal_creators')
        .select('*')
        .eq('deal_id', dealData.id)
        .eq('creator_id', creatorId)
        .maybeSingle()

      if (creatorError && creatorError.code !== 'PGRST116') {
        throw new Error('Database error: ' + creatorError.message)
      }

      if (!creator) {
        const { data: newRecord, error: insertError } = await supabase
          .from('deal_creators')
          .insert({
            deal_id: dealData.id,
            creator_id: creatorId,
            creator_email: email,
            status: 'active'
          })
          .select()
          .single()
        if (insertError) throw new Error('Failed to create record: ' + insertError.message)
        creator = newRecord
      } else if (creator.status === 'pending') {
        await supabase
          .from('deal_creators')
          .update({ status: 'active' })
          .eq('id', creator.id)
        creator.status = 'active'
      }

      setJustActivatedDealId(dealData.id)
      setActivatedEmail(email)

      const allDeals = await fetchAllDeals(email)
      setDeals(allDeals)
      setLoading(false)
    } catch (err: any) {
      console.error('激活错误:', err)
      setError(err.message || '激活失败，请稍后重试')
      setLoading(false)
    } finally {
      setActivating(false)
    }
  }

  const handleSubmitQuote = async (dealId: string, rate: string) => {
    if (!rate || rate === '') {
      alert('Please enter your rate')
      return
    }
    const supabase = createClient()
    const { error } = await supabase
      .from('deal_creators')
      .update({ quoted_rate: parseFloat(rate), status: 'quoted' })
      .eq('deal_id', dealId)
      .eq('creator_email', activatedEmail)
    if (error) {
      alert('Submission failed: ' + error.message)
    } else {
      alert('✅ Quote submitted successfully!')
      const allDeals = await fetchAllDeals(activatedEmail!)
      setDeals(allDeals)
      setQuotedRate('')
    }
  }

  useEffect(() => {
    if (!token) {
      setError('Missing activation code')
      setLoading(false)
      return
    }

    if (urlEmail) {
      activateCampaign(urlEmail)
    } else {
      setShowEmailInput(true)
      setLoading(false)
    }
  }, [token, urlEmail])

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputEmail) return
    activateCampaign(inputEmail)
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading...</div>
  }

  if (error && !showEmailInput) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>❌ {error}</div>
  }

  if (showEmailInput) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 20 }}>
        <h2>Enter your email to activate</h2>
        {error && (
          <div style={{ color: 'red', marginBottom: 10, fontSize: 14 }}>
            ❌ {error}
          </div>
        )}
        <form onSubmit={handleEmailSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
            required
          />
          <button
            type="submit"
            disabled={activating}
            style={{ marginTop: 10, width: '100%', padding: 10, background: '#3b82f6', color: 'white', borderRadius: 8, border: 'none' }}
          >
            {activating ? 'Activating...' : 'Activate'}
          </button>
        </form>
      </div>
    )
  }

  if (deals.length === 0 && !activatedEmail) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No campaigns found</div>
  }

  const activeDeal = deals.find(d => d.deal.id === justActivatedDealId)

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>🎉 Welcome, {activatedEmail || 'Creator'}!</h1>
      <p style={{ color: '#4b5563', marginBottom: 20 }}>
        You have successfully activated your account. Here are all your brand deals:
      </p>

      {activeDeal && (
        <div style={{ background: '#e0f2fe', border: '2px solid #3b82f6', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <p style={{ fontWeight: 'bold', margin: 0 }}>✅ Just activated:</p>
          <p style={{ margin: 0 }}><strong>{activeDeal.deal.brand_name}</strong> — {activeDeal.deal.product_name || 'No product'}</p>
        </div>
      )}

      {deals.length === 0 ? (
        <p>No deals found.</p>
      ) : (
        <div style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Brand</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Product</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Budget</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((item) => (
                <tr key={item.deal.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.deal.brand_name}</td>
                  <td style={{ padding: '12px 16px' }}>{item.deal.product_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{item.deal.budget ? `$${item.deal.budget}` : '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      background: item.creator_status === 'accepted' ? '#d1fae5' : item.creator_status === 'active' ? '#dbeafe' : '#fef3c7',
                      color: item.creator_status === 'accepted' ? '#065f46' : item.creator_status === 'active' ? '#1e40af' : '#92400e'
                    }}>
                      {item.creator_status || 'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 品牌反馈显示 */}
      {activeDeal?.deal.brand_feedback && (
        <div style={{ marginTop: 24, padding: '12px 16px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1e40af' }}>Brand Feedback:</p>
          <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#374151' }}>
            {activeDeal.deal.brand_feedback_comment || activeDeal.deal.brand_feedback}
          </p>
        </div>
      )}

      {activeDeal && (
        <div style={{ background: '#f9fafb', padding: 20, borderRadius: 8, marginTop: 24 }}>
          <h3 style={{ margin: '0 0 8px 0' }}>💰 Submit your quote for {activeDeal.deal.brand_name}</h3>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#4b5563' }}>
            Requirements: {activeDeal.deal.requirements || 'No specific requirements'}
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Your rate (USD)"
              value={quotedRate}
              onChange={(e) => setQuotedRate(e.target.value)}
              style={{ padding: 8, border: '1px solid #ccc', borderRadius: 6, flex: 1 }}
            />
            <button
              onClick={() => handleSubmitQuote(activeDeal.deal.id, quotedRate)}
              style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer' }}
            >
              Submit Quote
            </button>
          </div>
        </div>
      )}
    </div>
  )
}