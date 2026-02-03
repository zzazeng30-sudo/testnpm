import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './0005_Lib/supabaseClient';
import MainLayout from './0002_Components/02_Layout/MainLayout';
import Auth from './0004_Features/001_Auth/Auth';
import AdminPage from './0004_Features/010_Admin/AdminPage'; // (혹시 라우트 필요할까봐 추가)
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  
  // [핵심 1] userProfile 상태 그릇 만들기
  const [userProfile, setUserProfile] = useState(null); 
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      console.log("🚀 앱 시작: 인증 확인 중...");
      try {
        // 1. 세션 확인
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (currentSession) {
          console.log("✅ 세션 발견:", currentSession.user.email);
          
          // [핵심 2] DB에서 내 정보(role 포함) 가져오기
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileError) {
            console.warn("⚠️ 프로필 조회 실패:", profileError);
            setSession(null);
            setUserProfile(null);
          } else {
            console.log("👤 프로필 조회 성공:", profile); // 여기서 데이터가 찍혀야 함
            
            // 승인 대기 체크
            if (profile.role !== 0 && profile.status === 'pending') {
              alert("관리자 승인 대기 중입니다.");
              await supabase.auth.signOut();
              setSession(null);
              setUserProfile(null);
            } else if (profile.status === 'rejected') {
              alert("가입이 승인되지 않았습니다.");
              await supabase.auth.signOut();
              setSession(null);
              setUserProfile(null);
            } else {
              // [핵심 3] 상태에 저장!
              setSession(currentSession);
              setUserProfile(profile); 
            }
          }
        } else {
          setSession(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error("🔥 에러 발생:", err);
        setSession(null);
        setUserProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    // 리스너 설정
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUserProfile(null); // 로그아웃 시 프로필도 비움
      } else if (event === 'SIGNED_IN' && session) {
        setSession(session);
        // 로그인 직후에는 checkAuth가 돌거나 여기서 프로필을 다시 조회해야 안전함
        // 일단은 세션만 업데이트하고, 리로드를 유도하거나 여기서 fetchProfile을 호출하기도 함
      }
    });

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>로딩중...</div>;
  }

  return (
    <Router>
      <Routes>
        {!session ? (
          <>
            <Route path="/login" element={<Auth />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          /* [핵심 4] MainLayout에게 userProfile을 챙겨서 보냅니다! */
          /* 이게 없으면 MainLayout에서 undefined가 뜹니다 */
          <Route path="/*" element={<MainLayout session={session} userProfile={userProfile} />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;