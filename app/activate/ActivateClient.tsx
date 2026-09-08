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

    // 第一步：查 deal_creators
    const { data: creators, error: cError } = await supabase
      .from('deal_creators')
      .select('deal_id, status, budget, brand_feedback, brand_feedback_comment')
      .eq('creator_email', email)

    if (cError || !creators || creators.length === 0) {
      console.log('deal_creators 没有记录')
      return []
    }

    // 第二步：提取所有 deal_id
    const dealIds = creators.map(c => c.deal_id)

    // 第三步：查 deals 表
    const { data: dealsData, error: dError } = await supabase
      .from('deals')
      .select('*')
      .in('id', dealIds)

    if (dError || !dealsData) {
      console.log('deals 表没有数据')
      return []
    }

    // 第四步：合并数据
    const merged = creators.map(creator => {
      const deal = dealsData.find(d => d.id === creator.deal_id)
      return {
        deal: {
          id: deal?.id || creator.deal_id,
          brand_name: deal?.brand_name || 'Unknown Brand',
          product_name: deal?.product_name || '',
          budget: creator.budget || deal?.budget || 0,
          requirements: deal?.requirements || '',
          status: deal?.status || 'active',
          created_at: deal?.created_at || new Date().toISOString(),
          brand_feedback: creator.brand_feedback || null,
          brand_feedback_comment: creator.brand_feedback_comment || null
        },
        creator_status: creator.status
      }
    })

    return merged
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
        .eq('creator_email', email)
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
            status: 'active',
            budget: 1100,
            brand_feedback: 'waitlist',
            brand_feedback_comment: 'We have kept your profile in the waitlist for future brand matches.'
          })
          .select()
          .single()
        if (insertError) throw new Error('Failed to create record: ' + insertError.message)
        creator = newRecord
      } else if (creator.status === 'pending') {
        await supabase
          .from('deal_creators')
          .update({ 
            status: 'active',
            budget: 1100,
            brand_feedback: 'waitlist',
            brand_feedback_comment: 'We have kept your profile in the waitlist for future brand matches.'
          })
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
           