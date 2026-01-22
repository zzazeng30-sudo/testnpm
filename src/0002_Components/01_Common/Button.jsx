// src/components/common/Button.jsx
import React from 'react';

// 기본 스타일은 유지하되, 색상을 props로 받게 처리
const Button = ({ children, onClick, disabled, variant = 'blue', type = 'button', style = {} }) => {
  
  // (참고) 기존 CSS 모듈을 안 쓰고 인라인 스타일이나 전역 클래스를 쓴다고 가정하거나, 
  // 만약 기존 styles 객체를 쓰고 싶다면 props로 넘겨받아야 합니다.
  // 여기서는 일단 '간단한 스타일'을 직접 적용하거나, 기존 클래스 이름을 조합하는 방식을 제안합니다.
  
  // 색상별 배경색 매핑 (Tailwind 색상 참고)
  const bgColors = {
    blue: '#2563eb',
    red: '#dc2626',
    gray: '#6b7280',
    green: '#16a34a',
    purple: '#7c3aed',
    cyan: '#0891b2',
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: 'none',
    color: 'white',
    fontWeight: '700',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    backgroundColor: bgColors[variant] || bgColors.blue,
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
    ...style, // 추가 스타일 덮어쓰기
  };

  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled} 
      style={buttonStyle}
    >
      {children}
    </button>
  );
};

export default Button;