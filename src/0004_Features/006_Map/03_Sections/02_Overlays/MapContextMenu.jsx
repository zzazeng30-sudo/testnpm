/**
 * [Revision Info]
 * Rev: 34.0 (Fix Icon Alignment & Style)
 * Author: AI Assistant
 * * [Design]
 * 1. 메뉴 아이콘: 텍스트 왼쪽(9시 방향)에 수평 정렬 (display: flex, alignItems: center)
 * 2. 아이콘 변경: 빨간색 핀 SVG 사용
 */

import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';

// 빨간 핀 아이콘 (메뉴용)
const RedPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ef4444"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>
);

const MapContextMenu = () => {
  const { contextMenu, handleContextMenuAction } = useMap();

  if (!contextMenu.visible) return null;

  const { x, y, pinId } = contextMenu;
  const isPinMenu = !!pinId; 

  const menuStyle = {
    position: 'absolute', top: y, left: x, width: '170px',
    backgroundColor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: '8px', zIndex: 3000, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    border: '1px solid #f0f0f0'
  };

  const itemStyle = {
    padding: '12px 16px', cursor: 'pointer', fontSize: '14px', color: '#333',
    borderBottom: '1px solid #f5f5f5', backgroundColor: 'white',
    transition: 'background 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px' // ★ 가로 정렬 핵심
  };

  // 1. 지도 배경 우클릭 메뉴
  if (!isPinMenu) {
    return (
      <div style={menuStyle} onContextMenu={e => e.preventDefault()}>
        <div 
          style={{ ...itemStyle, color: '#111827', fontWeight: '600' }} 
          onClick={() => handleContextMenuAction('createPin')}
          onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
          onMouseOut={e => e.currentTarget.style.background = 'white'}
        >
           {/* 아이콘과 텍스트 가로 배치 */}
           <RedPinIcon />
           <span>이곳에 매물 등록</span>
        </div>
      </div>
    );
  }

  // 2. 마커(핀) 우클릭 메뉴
  return (
    <div style={menuStyle} onContextMenu={e => e.preventDefault()}>
      <div style={{ padding: '8px 12px', background: '#f8f9fa', fontSize: '12px', color: '#666', borderBottom: '1px solid #eee', fontWeight:'bold' }}>
         매물 관리
      </div>
      <div style={itemStyle} onClick={() => handleContextMenuAction('editPin')}>✏️ 매물 수정</div>
      
      <div 
        style={itemStyle} 
        onClick={() => handleContextMenuAction('addStack')}
        onMouseOver={e => e.currentTarget.style.background = '#f0f9ff'}
        onMouseOut={e => e.currentTarget.style.background = 'white'}
      >
        📚 스택 추가
      </div>

      <div style={itemStyle} onClick={() => handleContextMenuAction('roadview')}>📷 로드뷰 보기</div>
      <div style={{...itemStyle, color:'#ef4444', borderBottom:'none'}} onClick={() => handleContextMenuAction('deletePin')}>🗑️ 매물 삭제</div>
    </div>
  );
};

export default MapContextMenu;