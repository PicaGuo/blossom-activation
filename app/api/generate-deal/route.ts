import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes, randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { brand_name, product_name, budget, requirements, emails } = body

    if (!brand_name || !emails || emails.length === 0) {
      return NextResponse.json(
        { error: '品牌名称和达人邮箱列表是必填项' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 创建 Campaign (deal)
    const token = randomBytes(32).toString('hex')
    const dealId = randomUUID()

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        id: dealId,
        brand_name,
        product_name: product_name || '',
        budget: budget ? parseFloat(budget) : null,
        requirements: requirements || '',
        token: token,
        status: 'active'
      })
      .select()
      .single()

    if (dealError) {
      console.error('创建 campaign 失败:', dealError)
      return NextResponse.json({ error: '创建 campaign 失败' }, { status: 500 })
    }

    // 2. 为每个邮箱查找或创建 profile，然后插入 deal_creators
    const creatorRecords = []
    for (const email of emails) {
      // 2a. 查找 profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      // 2b. 如果不存在，创建 profile（自动生成 UUID）
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            email: email,
            full_name: email.split('@')[0],
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('创建 profile 失败:', insertError)
          continue // 跳过这个邮箱，继续下一个
        }
        profile = newProfile
      }

      creatorRecords.push({
        deal_id: dealId,
        creator_id: profile.id,
        creator_email: email,
        status: 'pending'
      })
    }

    if (creatorRecords.length === 0) {
      return NextResponse.json({ error: '没有成功创建任何达人记录' }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('deal_creators')
      .insert(creatorRecords)

    if (insertError) {
      console.error('插入达人记录失败:', insertError)
      return NextResponse.json({ error: '创建达人记录失败' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const baseLink = `${baseUrl}/activate?token=${token}`

    const links = emails.map((email: string) => ({
      email,
      link: `${baseLink}&email=${encodeURIComponent(email)}`
    }))

    return NextResponse.json({
      success: true,
      baseLink,
      links,
      dealId
    })

  } catch (error) {
    console.error('接口报错:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
