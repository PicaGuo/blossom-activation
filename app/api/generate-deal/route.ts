import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { brand_name, product_name, budget, requirements, brief_url, emails } = body

    if (!brand_name || !emails || emails.length === 0) {
      return NextResponse.json({ error: '品牌名称和达人邮箱列表是必填项' }, { status: 400 })
    }

    const supabase = await createClient()

    const token = randomBytes(32).toString('hex')
    const dealId = randomUUID()

    const { error: dealError } = await supabase
      .from('deals')
      .insert({
        id: dealId,
        brand_name,
        product_name: product_name || '',
        budget: budget ? parseFloat(budget) : null,
        requirements: requirements || '',
        brief_url: brief_url || null,
        token,
        status: 'active'
      })

    if (dealError) {
      console.error('创建 campaign 失败:', dealError)
      return NextResponse.json({ error: '创建 campaign 失败' }, { status: 500 })
    }

    const creatorRecords = []
    for (const email of emails) {
      let { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ email, full_name: email.split('@')[0] })
          .select('id')
          .single()
        if (insertError) {
          console.error('创建 profile 失败:', insertError)
          continue
        }
        profile = newProfile
      }

      creatorRecords.push({
        deal_id: dealId,
        creator_id: profile!.id,
        creator_email: email,
        status: 'pending'
      })
    }

    if (creatorRecords.length > 0) {
      const { error: insertError } = await supabase.from('deal_creators').insert(creatorRecords)
      if (insertError) {
        console.error('插入达人记录失败:', insertError)
        return NextResponse.json({ error: '创建达人记录失败' }, { status: 500 })
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const baseLink = `${baseUrl}/activate?token=${token}`

    const links = emails.map((email: string) => ({
      email,
      link: `${baseLink}&email=${encodeURIComponent(email)}`
    }))

    return NextResponse.json({ success: true, baseLink, links, dealId })
  } catch (error) {
    console.error('接口报错:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}