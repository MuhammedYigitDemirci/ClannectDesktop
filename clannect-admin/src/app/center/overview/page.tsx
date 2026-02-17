import React from 'react'

export default function OverviewPage() {
  return (
    <main style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1724', color: '#fff', fontFamily: 'Inter, system-ui, Arial, Helvetica, sans-serif'}}>
      <div style={{background: '#111827', padding: 28, borderRadius: 10, maxWidth: 720, textAlign: 'center'}}>
        <h1 style={{color: '#ff4234', margin: 0}}>Center — Overview</h1>
        <p style={{marginTop: 8, color: '#9ca3af'}}>Placeholder dashboard. Admin access only.</p>
      </div>
    </main>
  )
}
