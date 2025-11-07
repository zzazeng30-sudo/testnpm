import React, { useState } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './Auth.module.css' // ★ 9일차: '로그인 전용 CSS'를 불러옵니다.

/* 9일차 '리셋': 'CSS 모듈'로 디자인을 분리한 '로그인' */
export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('') 

  // (로그인/회원가입 기능은 8일차와 100% 동일)
  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('') 
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMessage(error.message)
    setLoading(false)
  }

  const handleSignUp = async (event) => {
    event.preventDefault()
    setLoading(true)
    setErrorMessage('') 
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) setErrorMessage(error.message)
    else setErrorMessage('회원가입 성공! 잠시 후 로그인됩니다.')
    setLoading(false)
  }

  // 화면 (UI)
  return (
    // ★ 9일차: 'className={styles.authContainer}'처럼 'CSS 모듈'을 사용합니다.
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h1 className={styles.title}>지도 핀 CRM</h1>
        <p className={styles.subtitle}>로그인 또는 회원가입</p>
        
        {errorMessage && (
          <p className={`${styles.errorMessage} ${
            errorMessage.includes('성공') ? styles.success : styles.error
          }`}>
            {errorMessage}
          </p>
        )}

        <form className={styles.form} onSubmit={handleLogin}>
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
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.button} ${styles.loginButton}`}
              type="submit" 
              disabled={loading}
            >
              {loading ? '로딩 중...' : '로그인'}
            </button>
            <button 
              className={`${styles.button} ${styles.signupButton}`}
              type="button" 
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? '...' : '회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}