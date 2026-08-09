'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface DealWithCreator {
  id: string
  brand_name: string
  product_name: string
  budget: number
  requirements: string
  creator_status: string
  deal_status: string
  created_at: string
}

export default function DashboardPage() {
  const [deals, setDeals] = useState<DealWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        setError('Please login first')
        setLoading(false)
        return
      }

      const email = data.user.email
      if (!email) {
        setError('No email found')
        setLoading(false)
        return
      }

      setUserEmail(email)

      // 获取该 email 对应的 profile id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (profileError || !profile) {
        setError('Profile not found. Please activate a deal first.')
        setLoading(false)
        return
      }

      setProfileId(profile.id)

      // 查询该 profile 的所有 deal_creators
      const { data: dealCreators, error: queryError } = await supabase
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
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (queryError) {
        setError('Failed to load deals')
        setLoading(false)
        return
      }

      const formatted = dealCreators.map((item: any) => ({
        id: item.deal.id,
        brand_name: item.deal.brand_name,
        product_name: item.deal.product_name,
        budget: item.deal.budget,
        requirements: item.deal.requirements,
        creator_status: item.status,
        deal_status: item.deal.status,
        created_at: item.deal.created_at
      }))

      setDeals(formatted)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ Loading your deals...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-600">❌ {error}</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-800">
          👋 I'm Lynsey, your brand deal manager via Blossom AI
        </h2>
        <p className="text-lg text-gray-700 mt-1">
          My name is Lynsey – I'll help you track all your collaborations.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          You are logged in as <span className="font-mono">{userEmail}</span>
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 Your Brand Deals</h1>
        <span className="text-sm text-gray-500">{deals.length} deal(s)</span>
      </div>

      {deals.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <p className="text-lg">No brand deals yet</p>
          <p className="text-sm">When brands invite you, they'll appear here</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Your Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{deal.brand_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{deal.product_name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{deal.budget ? `$${deal.budget}` : '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      deal.creator_status === 'accepted' ? 'bg-green-100 text-green-800' :
                      deal.creator_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {deal.creator_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/deal/${deal.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}