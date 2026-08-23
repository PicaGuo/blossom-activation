'use client'

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

export default function OrderList({ deals, userEmail }: { deals: CreatorDeal[]; userEmail?: string | null }) {
  if (deals.length === 0) {
    return <p>No campaigns found.</p>
  }

  return (
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
                  background: item.creator_status === 'quoted' ? '#d1fae5' : item.creator_status === 'active' ? '#dbeafe' : '#fef3c7',
                  color: item.creator_status === 'quoted' ? '#065f46' : item.creator_status === 'active' ? '#1e40af' : '#92400e'
                }}>
                  {item.creator_status || 'pending'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}