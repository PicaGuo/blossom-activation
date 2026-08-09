import { Suspense } from 'react'
import ActivateClient from './ActivateClient'

export default function ActivatePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>⏳ Loading...</div>}>
      <ActivateClient />
    </Suspense>
  )
}