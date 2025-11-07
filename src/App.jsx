import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import Auth from './Auth.jsx' 
import MainLayout from './MainLayout.jsx' // ★ 9일차: '메인 레이아웃'을 분리합니다.

/* 9일차 '리셋': App.jsx는 '현관문' 역할만 합니다. */
function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. 앱이 처음 켜질 때, '현재 로그인한 사용자'가 있는지 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. '로그인'이나 '로그아웃' 상태가 바뀔 때마다 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // 3. 리스너 정리
    return () => subscription.unsubscribe()
  }, [])

  // 로딩 중일 때 (Tailwind 적용)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <h2 className="text-xl font-medium text-gray-700">Loading...</h2>
      </div>
    )
  }

  // 로딩 끝
  return (
    <div className="h-screen">
      {!session ? (
        // 세션(로그인)이 없으면 <Auth /> (로그인 화면)을 보여줌
        <Auth />
      ) : (
        // 세션(로그인)이 있으면 <MainLayout /> (헤더/본문/푸터)을 보여줌
        <MainLayout session={session} />
      )}
    </div>
  )
}

export default App