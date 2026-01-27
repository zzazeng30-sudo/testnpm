import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './0005_Lib/supabaseClient';
import MainLayout from './0002_Components/02_Layout/MainLayout';
import Auth from './0004_Features/001_Auth/Auth';
import './App.css';

// 지적분석 페이지는 MainLayout 내부의 menuConfig를 통해 렌더링되므로 
// App.jsx에서 직접 import하여 Route를 만들 필요는 없으나, 
// 구조적 명확성을 위해 유지하거나 MainLayout에 session을 잘 전달하는 것이 중요합니다.

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', fontSize: '1.2rem' }}>
        사용자 정보를 확인 중입니다...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {!session ? (
          // 로그인이 안 된 경우: 로그인 페이지로 강제 이동
          <>
            <Route path="/login" element={<Auth />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          // 로그인 된 경우: MainLayout이 모든 라우팅과 메뉴 전환을 담당
          // /* 경로를 통해 MainLayout 내부의 탭 전환 시스템이 작동하게 합니다.
          <Route path="/*" element={<MainLayout session={session} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
