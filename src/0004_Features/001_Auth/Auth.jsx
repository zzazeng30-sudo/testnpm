import React, { useState } from 'react';
import { authService } from '../../services/authService';
import styles from './Auth.module.css'; // 스타일 파일이 있다면 import

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // [수정] 모든 입력 필드 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    job_title: '',
    address: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (isSignUp) {
      // 1. 회원가입: 입력된 모든 정보를 넘김
      result = await authService.signUp(formData);
      if (!result.error) {
        alert('회원가입 성공! (이메일 확인이 필요할 수 있습니다)\n자동으로 로그인됩니다.');
      }
    } else {
      // 2. 로그인: 이메일과 비번만 사용
      result = await authService.signIn({ 
        email: formData.email, 
        password: formData.password 
      });
    }

    if (result.error) {
      alert((isSignUp ? '회원가입' : '로그인') + ' 실패: ' + result.error.message);
    }
    setLoading(false);
  };

  // 인라인 스타일 (필요시 css 파일로 이동 가능)
  const containerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f3f4f6' };
  const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px', padding: '40px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '350px' };
  const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '4px' };
  const btnStyle = { padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' };

  return (
    <div style={containerStyle}>
      <form onSubmit={handleAuth} style={formStyle}>
        <h2 style={{ margin: '0 0 20px', textAlign: 'center' }}>
          {isSignUp ? '회원가입' : '로그인'}
        </h2>
        
        {/* 공통 필드 */}
        <input name="email" type="email" placeholder="이메일 (ID)" value={formData.email} onChange={handleChange} required style={inputStyle} />
        <input name="password" type="password" placeholder="비밀번호" value={formData.password} onChange={handleChange} required style={inputStyle} />
        
        {/* 회원가입일 때만 보이는 추가 필드 */}
        {isSignUp && (
          <>
            <input name="full_name" type="text" placeholder="이름" value={formData.full_name} onChange={handleChange} required style={inputStyle} />
            <input name="phone_number" type="text" placeholder="연락처 (010-XXXX-XXXX)" value={formData.phone_number} onChange={handleChange} required style={inputStyle} />
            <input name="job_title" type="text" placeholder="직책 (예: 대표, 실장)" value={formData.job_title} onChange={handleChange} style={inputStyle} />
            <input name="address" type="text" placeholder="주소" value={formData.address} onChange={handleChange} style={inputStyle} />
          </>
        )}
        
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? '처리 중...' : (isSignUp ? '가입하기' : '로그인')}
        </button>

        <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '10px' }}>
          <span style={{ color: '#666' }}>
            {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
          </span>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
          >
            {isSignUp ? '로그인으로 전환' : '회원가입으로 전환'}
          </button>
        </div>
      </form>
    </div>
  );
}