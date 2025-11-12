import React, { useState } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './Auth.module.css' 

/* 21일차 (수정): 회원가입 시 이름, 연락처, 주소 추가 */
export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // ★ 21일차: 회원가입용 추가 정보 state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  
  const [errorMessage, setErrorMessage] = useState('') 
  
  // ★ 21일차: 로그인 / 회원가입 모드 전환
  const [isLoginMode, setIsLoginMode] = useState(true);

  // 로그인 핸들러 (변경 없음)
  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('') 
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMessage(error.message)
    setLoading(false)
  }

  // ★ 21일차 (수정): 회원가입 핸들러
  const handleSignUp = async (event) => {
    event.preventDefault()
    
    // (입력값 유효성 검사)
    if (!fullName || !phone || !address) {
        setErrorMessage('이름, 연락처, 주소는 필수입니다.');
        return;
    }
    
    setLoading(true)
    setErrorMessage('') 
    
    // 1. Supabase Auth에 사용자 생성 (이메일, 비번)
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password 
    });
    
    if (authError) {
      setErrorMessage(authError.message)
      setLoading(false)
      return;
    }
    
    if (authData.user) {
        // 2. (★핵심★) 'profiles' 테이블에 추가 정보(이름, 연락처, 주소) 저장
        // (Supabase 트리거가 'profiles'에 빈 행을 생성한다고 가정하고 'update' 사용)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                phone: phone,
                address: address,
                updated_at: new Date().toISOString()
            })
            .eq('id', authData.user.id); // ★ auth.user.id와 profiles.id를 연결

        if (profileError) {
             setErrorMessage(`회원가입은 성공했으나 프로필 저장 실패: ${profileError.message}`);
        } else {
             setErrorMessage('회원가입 성공! 잠시 후 로그인됩니다.');
             // (이후 onAuthStateChange가 감지하여 자동 로그인 처리)
        }
    }
    setLoading(false)
  }

  // 화면 (UI)
  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h1 className={styles.title}>지도 핀 CRM</h1>
        <p className={styles.subtitle}>
            {isLoginMode ? '로그인' : '회원가입'}
        </p>
        
        {errorMessage && (
          <p className={`${styles.errorMessage} ${
            errorMessage.includes('성공') ? styles.success : styles.error
          }`}>
            {errorMessage}
          </p>
        )}

        {/* 폼을 분리하지 않고, isLoginMode에 따라 입력칸을 숨김 */}
        <form className={styles.form} onSubmit={isLoginMode ? handleLogin : handleSignUp}>
          <div>
            <label className={styles.label}>이메일</label>
            <input
              className={styles.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              required={true}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={styles.label}>비밀번호</label>
            <input
              className={styles.input}
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              required={true}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* --- ★ 21일차: 회원가입 전용 필드 --- */}
          {!isLoginMode && (
            <>
              <div>
                <label className={styles.label}>이름 (필수)</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="홍길동"
                  value={fullName}
                  required={true}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.label}>연락처 (필수)</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="010-1234-5678"
                  value={phone}
                  required={true}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.label}>사무실 주소 (필수)</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  value={address}
                  required={true}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </>
          )}
          {/* --- (여기까지) --- */}


          <div className={styles.buttonGroup}>
            {isLoginMode ? (
              <button 
                className={`${styles.button} ${styles.loginButton}`}
                type="submit" 
                disabled={loading}
              >
                {loading ? '로딩 중...' : '로그인'}
              </button>
            ) : (
              <button 
                className={`${styles.button} ${styles.signupButton}`}
                type="submit" 
                disabled={loading}
              >
                {loading ? '...' : '가입 완료'}
              </button>
            )}
          </div>
        </form>
        
        {/* 모드 전환 버튼 */}
        <button 
            onClick={() => setIsLoginMode(!isLoginMode)}
            className={styles.toggleButton} // (CSS 추가 필요)
        >
            {isLoginMode ? '계정이 없으신가요? (회원가입)' : '이미 계정이 있으신가요? (로그인)'}
        </button>

      </div>
    </div>
  )
}