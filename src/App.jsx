import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient.js'
import Auth from './features/auth/Auth.jsx' 
import MainLayout from './components/layout/MainLayout.jsx'
import ProposalViewer from './features/property/ProposalViewer.jsx' // ★ 추가

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareMode, setShareMode] = useState(false) // ★ 공유 모드 상태

  useEffect(() => {
    // 1. URL 확인: 공유 링크(?share=...)인지 체크
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) {
        setShareMode(true);
        setLoading(false);
        return; // 공유 모드면 로그인 체크 스킵
    }

    // 2. 기존 로그인 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <h2 className="text-xl font-medium text-gray-700">Loading...</h2>
      </div>
    )
  }

  // ★ 공유 모드이면 뷰어만 렌더링
  if (shareMode) {
    return <ProposalViewer />
  }

  return (
    <div className="h-screen">
      {!session ? <Auth /> : <MainLayout session={session} />}
    </div>
  )
}

export default App