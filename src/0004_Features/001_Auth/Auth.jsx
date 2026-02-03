import React, { useState } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';
import styles from './Auth.module.css';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // 로그인 vs 회원가입 토글
  
  // 입력 폼 상태 (직책, 주소 제거함)
  const [formData, setFormData] = useState({
    userId: '',   // 이메일 대신 사용할 아이디
    password: '',
    name: '',
    phone: ''
  });

  // 입력값 변경 핸들러
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 로그인 & 회원가입 처리
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { userId, password, name, phone } = formData;

    // 1. 유효성 검사 (간소화됨)
    if (!userId || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      alert("비밀번호는 4자리 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    // [핵심] Supabase는 이메일이 필수이므로, 아이디 뒤에 가짜 도메인을 붙여서 보냄
    // 사용자는 'user1'로 입력하지만, 실제로는 'user1@local.com'으로 처리됨
    const emailToUse = userId.includes('@') ? userId : `${userId}@local.com`;

    try {
      if (isSignUp) {
        // --- 회원가입 로직 ---
        if (!name || !phone) {
          alert("이름과 연락처를 입력해주세요.");
          setLoading(false);
          return;
        }

        // 1. 계정 생성
        const { data, error } = await supabase.auth.signUp({
          email: emailToUse,
          password: password,
        });

        if (error) throw error;

        if (data.user) {
          // 2. 프로필 정보 저장 (직책, 주소 제외하고 저장)
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              email: emailToUse, // DB에는 풀 이메일 저장
              name: name,
              phone: phone,
              status: 'pending', // 승인 대기 상태
              role: 2            // 일반 사용자
            }]);

          if (profileError) {
            // 프로필 저장 실패 시 계정 삭제 (롤백 흉내)
            await supabase.auth.admin.deleteUser(data.user.id); 
            throw profileError;
          }

          alert("회원가입이 완료되었습니다! 관리자 승인을 기다려주세요.");
          window.location.reload();
        }

      } else {
        // --- 로그인 로직 ---
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: password,
        });

        if (error) throw error;
        // 로그인 성공 시 App.js의 리스너가 알아서 처리함
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authBox}>
        <h2 className={styles.title}>
          {isSignUp ? '회원가입' : '로그인'}
        </h2>
        
        <form onSubmit={handleAuth} className={styles.form}>
          {/* 1. 아이디 입력 (이메일 형식 아님) */}
          <div className={styles.inputGroup}>
            <label>아이디</label>
            <input
              type="text"
              name="userId"
              placeholder="아이디 입력"
              value={formData.userId}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {/* 2. 비밀번호 입력 (4자리 이상) */}
          <div className={styles.inputGroup}>
            <label>비밀번호</label>
            <input
              type="password"
              name="password"
              placeholder="비밀번호 (4자리 이상)"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          {/* 회원가입일 때만 보이는 추가 정보 */}
          {isSignUp && (
            <>
              <div className={styles.inputGroup}>
                <label>이름</label>
                <input
                  type="text"
                  name="name"
                  placeholder="실명 입력"
                  value={formData.name}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>연락처</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="010-0000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </>
          )}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? '처리 중...' : (isSignUp ? '가입하기' : '로그인')}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
          <span 
            className={styles.toggleLink} 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setFormData({ userId: '', password: '', name: '', phone: '' }); // 폼 초기화
            }}
          >
            {isSignUp ? ' 로그인하기' : ' 회원가입하기'}
          </span>
        </p>
      </div>
    </div>
  );
}