'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import OrderList from '@/app/components/OrderList'

interface Deal {
  id: string
  brand_name: string
  product_name: string
  budget: number
  requirements: string
  status: string
  created_at: string
}

interface CreatorDeal {
  deal: Deal
  creator_status: string
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<CreatorDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchData = async () => {
      // 1. 获取当前用户
      const { data: userData, error: authError } = await supabase.auth.getUser()
      if (authError || !userData?.user) {
        setError('Please login first')
        setLoading(false)
        return
      }

      const email = userData.user.email
      if (!email) {
        setError('No email found')
        setLoading(false)
        return
      }
      setUserEmail(email)

      // 2. 获取 profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (profileError || !profileData) {
        setError('Profile not found. Please activate a deal first.')
        setLoading(false)
        return
      }

      // 3. 获取 deal_creators 数据
      const { data: dealData, error: queryError } = await supabase
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
            created_at
          )
        `)
        .eq('creator_id', profileData.id)
        .order('created_at', { ascending: false })

      if (queryError) {
        setError('Failed to load deals')
        setLoading(false)
        return
      }

      const formatted = dealData.map((item: any) => ({
        deal: item.deal,
        creator_status: item.status
      }))

      setDeals(formatted)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading your deals...</div>
  }

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>❌ {error}</div>
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>📋 Your Brand Deals</h1>
      <p style={{ color: '#4b5563', marginBottom: 20 }}>Welcome back, {userEmail}!</p>

      {deals.length === 0 ? (
        <p>You haven't joined any campaigns yet.</p>
      ) : (
        <OrderList deals={deals} userEmail={userEmail} />
      )}
    </div>
  )
}