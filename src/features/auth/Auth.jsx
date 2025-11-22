import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import Auth from './Auth.jsx' 
import MainLayout from '../../components/layout/MainLayout.jsx'
import ProposalViewer from '../property/ProposalViewer.jsx' 

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareMode, setShareMode] = useState(false) 

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) {
        setShareMode(true);
        setLoading(false);
        return; 
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
        Loading...
      </div>
    )
  }

  if (shareMode) {
    return <ProposalViewer />
  }

  return (
    <div style={{ height: '100vh' }}>
      {!session ? <Auth /> : <MainLayout session={session} />}
    </div>
  )
}

export default App