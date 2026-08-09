'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [form, setForm] = useState({
    brand_name: '',
    product_name: '',
    budget: '',
    requirements: '',
    emails: ''
  })
  const [loading, setLoading] = useState(false)
  const [generatedLinks, setGeneratedLinks] = useState<{ email: string; link: string }[]>([])
  const [baseLink, setBaseLink] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setGeneratedLinks([])
    setBaseLink('')

    const emailList = form.emails.split('\n').map(e => e.trim()).filter(e => e)
    if (emailList.length === 0) {
      setError('请至少输入一个达人邮箱')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/generate-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: form.brand_name,
          product_name: form.product_name,
          budget: form.budget,
          requirements: form.requirements,
          emails: emailList
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成失败')

      setBaseLink(data.baseLink)
      setGeneratedLinks(data.links)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    const text = generatedLinks.map(l => `${l.email}\t${l.link}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('✅ 已复制所有链接（含邮箱）')
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">📢 创建 Campaign</h1>
      <p className="text-gray-500 mb-8">输入品牌信息和多个达人邮箱，生成通用激活链接。</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">品牌名称 *</label>
          <input
            type="text"
            required
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Nike"
            value={form.brand_name}
            onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">产品/项目</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="Air Max 推广"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">预算 (USD)</label>
          <input
            type="number"
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="5000"
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">要求</label>
          <input
            type="text"
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="拍摄2条视频"
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">达人邮箱列表 *</label>
          <textarea
            required
            rows={5}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2"
            placeholder="每行一个邮箱&#10;creator1@gmail.com&#10;creator2@gmail.com"
            value={form.emails}
            onChange={(e) => setForm({ ...form, emails: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">每行一个邮箱，可批量粘贴</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:bg-gray-400"
        >
          {loading ? '生成中...' : '✨ 创建 Campaign 并生成链接'}
        </button>
      </form>

      {error && <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">❌ {error}</div>}

      {baseLink && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium mb-2">✅ 通用链接已生成：</p>
          <input readOnly className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm" value={baseLink} />
          <p className="text-xs text-gray-500 mt-1">此链接可分享给任何人，未带邮箱时需输入邮箱。</p>
          <div className="mt-4">
            <p className="font-medium text-gray-700">每个达人的专属链接（带邮箱）：</p>
            <div className="max-h-60 overflow-y-auto">
              {generatedLinks.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1 border-b border-gray-100">
                  <span className="text-sm w-48 truncate">{item.email}</span>
                  <input readOnly className="flex-1 bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm" value={item.link} />
                </div>
              ))}
            </div>
            <button onClick={copyAll} className="mt-3 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
              📋 复制所有链接（含邮箱）
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
