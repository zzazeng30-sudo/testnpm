import React, { useState, isValidElement, cloneElement } from 'react';
import { mainMenus, menuData } from './menuConfig';

export default function MobileLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[1]);
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[1]][0].id);

  const currentSubList = menuData[activeMainMenu] || [];
  const currentPage = currentSubList.find(m => m.id === activeSubMenu) || currentSubList[0];

  const s = {
    wrapper: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff', overflow: 'hidden' },
    header: { display: 'flex', overflowX: 'auto', borderBottom: '1px solid #eee', flexShrink: 0, backgroundColor: '#fff' },
    tab: { padding: '15px 20px', whiteSpace: 'nowrap', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
    content: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }
  };

  // ★ 에러 해결 핵심 로직: 객체(JSX)와 함수(컴포넌트)를 모두 지원
  const renderContent = () => {
    const rawComponent = currentPage?.component;
    if (!rawComponent) return <div style={{ padding: '20px' }}>준비 중...</div>;

    const commonProps = { 
      session,
      ...(currentPage.mode && { mode: currentPage.mode }),
      ...(currentPage.isMyPage && { initialTab: currentPage.id === 'my-staff' ? 'staff' : 'info' })
    };

    // 1. 이미 <DashboardPage /> 처럼 생성된 객체인 경우 (isValidElement)
    if (isValidElement(rawComponent)) {
      return cloneElement(rawComponent, commonProps);
    }

    // 2. DashboardPage 처럼 컴포넌트 함수 자체인 경우
    const Component = rawComponent;
    return <Component {...commonProps} />;
  };

  return (
    <div style={s.wrapper}>
      <header style={s.header} className="no-scrollbar">
        {mainMenus.map(m => (
          <div 
            key={m} 
            style={{
              ...s.tab,
              color: activeMainMenu === m ? '#2563eb' : '#888',
              borderBottom: activeMainMenu === m ? '3px solid #2563eb' : '3px solid transparent'
            }}
            onClick={() => {
              setActiveMainMenu(m);
              setActiveSubMenu(menuData[m][0].id);
            }}
          >
            {m}
          </div>
        ))}
      </header>
      <main style={s.content}>
        {renderContent()}
      </main>
    </div>
  );
}