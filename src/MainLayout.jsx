import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import MapPage from './MapPage.jsx';
import CustomerPage from './CustomerPage.jsx';
import ContractPage from './ContractPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import MyPage from './MyPage.jsx'; 
import styles from './MainLayout.module.css';

// ★ 8일차: 기획안의 모든 메뉴 구조를 '데이터'로 정의
const menuData = {
  '대시보드': [
    // 12일차: DashboardPage 연결
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage /> },
    { id: 'dashboard-new', name: '신규 현황', component: <DashboardPage /> }, 
    { id: 'dashboard-list', name: '매물 등록' },
    { id: 'dashboard-stats', name: '경영통계' },
  ],
  '부동산 원장': [
    { id: 're-map', name: '지도 관리', component: <MapPage />, isMap: true },
    { id: 're-list', name: '매물 리스트' },
    { id: 're-upload', name: '매물 등록' },
    { id: 're-im', name: 'im자료 생성' },
    { id: 're-tour', name: '임장 동선 최적화' },
  ],
  '고객': [
    { id: 'cust-list', name: '고객 리스트', component: <CustomerPage />, isMap: true },
    { id: 'cust-upload', name: '고객 등록' },
    { id: 'cust-match', name: '매물 매칭' },
    { id: 'cust-log', name: '상담 이력 관리' },
    { id: 'cust-briefing', name: '브리핑룸 관리' },
  ],
  '계약': [
    // 11일차: ContractPage 연결
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true }, 
    { id: 'cont-upload', name: '계약서 작성' },
  ],
  '마이페이지': [
    // 13일차: MyPage 컴포넌트 연결 및 탭 구분을 위한 플래그 추가
    { id: 'my-info', name: '내정보 수정', component: <MyPage />, isMyPage: true },
    { id: 'my-staff', name: '직원 관리', component: <MyPage />, isMyPage: true },
    { id: 'my-payment', name: '결제 관리' },
  ],
  '고객센터': [
    { id: 'sup-notice', name: '공지사항' },
    { id: 'sup-qna', name: '1:1 문의하기' },
  ],
  '사용방법': [
    { id: 'guide-main', name: '사용방법' },
  ]
};

const mainMenus = Object.keys(menuData);

/* 9일차: 'CSS 모듈'로 디자인을 분리한 '메인 레이아웃' */
export default function MainLayout({ session }) {
  // 기본: '대시보드'로 설정 변경
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[0]); 
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[0]][0].id);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('로그아웃 오류:', error);
  };

  const handleMainMenuClick = (menuName) => {
    setActiveMainMenu(menuName);
    setActiveSubMenu(menuData[menuName][0].id);
  };

  const handleSubMenuClick = (menuId) => {
    setActiveSubMenu(menuId);
  };

  const renderPageContent = () => {
    const subMenuList = menuData[activeMainMenu];
    let activePage = subMenuList.find(menu => menu.id === activeSubMenu);

    if (activePage && activePage.component) {
      
      // 13일차: MyPage 컴포넌트의 탭 전환을 위해 props를 전달합니다.
      if (activePage.isMyPage) {
          // 현재 활성화된 서브 메뉴 ID를 props로 전달하여 MyPage 내부에서 탭을 전환하게 함
          const tabId = activePage.id === 'my-info' ? 'info' : 
                        activePage.id === 'my-staff' ? 'staff' : 'info';
          
          activePage = {
            ...activePage,
            component: React.cloneElement(activePage.component, { 
                session, 
                initialTab: tabId 
            })
          };
      } else {
           // 다른 컴포넌트 (Dashboard, Map, Customer, Contract)에는 session props를 전달
           activePage = {
            ...activePage,
            component: React.cloneElement(activePage.component, { session })
          };
      }

      // '지도/고객/계약' 페이지는 'padding: 0'인 100% 높이 컨테이너
      if (activePage.isMap) {
        return <div className={styles.pageContainerMap}>{activePage.component}</div>;
      }
      // '일반' 페이지
      return <div className={styles.pageContainer}>{activePage.component}</div>;
    }

    // '준비중' 페이지
    return (
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>{activePage ? activePage.name : '준비중'}</h1>
        <p>이 페이지는 9일차부터 '활성화'될 예정입니다.</p>
        <p style={{marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280'}}>
          선택된 대메뉴: {activeMainMenu} <br />
          선택된 상세메뉴 ID: {activeSubMenu}
        </p>
      </div>
    );
  };

  return (
    // '헤더/본문/푸터' 레이아웃
    <div className={styles.layoutContainer}>
      
      {/* --- 1. 헤더 (대메뉴) --- */}
      <header className={styles.mainMenuBar}>
        <nav className={styles.mainMenuTabs}>
          {mainMenus.map(menuName => (
            <button
              key={menuName}
              className={`${styles.mainMenuTab} ${activeMainMenu === menuName ? styles.active : ''}`}
              onClick={() => handleMainMenuClick(menuName)}
            >
              {menuName}
            </button>
          ))}
        </nav>
        
        <div className={styles.mainMenuUserInfo}>
          <span className={styles.mainMenuUserEmail}>{session.user.email} 님</span>
          <button 
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* --- 2. 상세메뉴 (Sub Menu) --- */}
      <nav className={styles.subMenuBar}>
        {menuData[activeMainMenu].map(menuItem => (
          <button
            key={menuItem.id}
            className={`${styles.subMenuTab} ${activeSubMenu === menuItem.id ? styles.active : ''}`}
            onClick={() => handleSubMenuClick(menuItem.id)}
          >
            {menuItem.name}
          </button>
        ))}
      </nav>

      {/* --- 3. 본문 (Content Area) --- */}
      <main className={styles.contentArea}>
        {renderPageContent()}
      </main>

      {/* --- 4. 푸터 (Footer / 상태바) --- */}
      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} 사장님 CRM. All rights reserved. (9일차 'CSS 모듈' 리셋 적용)
        </p>
      </footer>

    </div>
  );
}