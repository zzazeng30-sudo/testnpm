import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';
import MapPage from './MapPage.jsx';
import CustomerPage from './CustomerPage.jsx';
import ContractPage from './ContractPage.jsx';
import DashboardPage from './DashboardPage.jsx';
import MyPage from './MyPage.jsx'; 
import ConsultationLogPage from './ConsultationLogPage.jsx'; 
import PropertyPage from './PropertyPage.jsx';
import styles from './MainLayout.module.css';

// ★ 21일차 (리팩토링): '고객' 탭 메뉴 재구성
const menuData = {
  '대시보드': [
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage /> },
    { id: 'dashboard-new', name: '신규 현황', component: <DashboardPage /> }, 
    { id: 'dashboard-list', name: '매물 등록', component: <PropertyPage />, isMap: true }, 
    { id: 'dashboard-stats', name: '경영통계', component: <DashboardPage /> }, 
  ],
  '매물': [
    { id: 'prop-map', name: '매물 지도', component: <MapPage />, isMap: true, mode: 'manage' },
    { id: 'prop-list', name: '매물 리스트', component: <PropertyPage />, isMap: true },
    { id: 'prop-tour', name: '임장 동선 최적화', component: <MapPage />, isMap: true, mode: 'tour' },
  ],
  '고객': [
    // ★ 21일차 (수정): '고객 등록'과 '고객 관리'에 mode prop 전달
    { id: 'cust-upload', name: '고객 등록', component: <CustomerPage />, isMap: true, mode: 'upload' },
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true, mode: 'manage' },
    { id: 'cust-match', name: '매물 매칭', component: <MapPage />, isMap: true, mode: 'tour' }, 
    { id: 'cust-log', name: '상담 이력 관리', component: <ConsultationLogPage />, isMap: true },
    { id: 'cust-briefing', name: '브리핑룸 관리' },
  ],
  '계약': [
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true }, 
    { id: 'cont-upload', name: '계약서 작성' },
  ],
  '마이페이지': [
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

const mainMenus = [
    '대시보드', 
    '매물', 
    '고객', 
    '계약', 
    '마이페이지', 
    '고객센터', 
    '사용방법'
];

export default function MainLayout({ session }) {
  const [activeMainMenu, setActiveMainMenu] = useState(mainMenus[1]); 
  const [activeSubMenu, setActiveSubMenu] = useState(menuData[mainMenus[1]][0].id);

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
      
      if (activePage.isMyPage) {
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
           // ★ 21일차 (수정): CustomerPage에도 mode prop이 전달되도록 함
           const propsToPass = { session };
           
           if (activePage.mode) {
              propsToPass.mode = activePage.mode;
           }

           activePage = {
            ...activePage,
            component: React.cloneElement(activePage.component, propsToPass)
          };
      }

      if (activePage.isMap) {
        return <div className={styles.pageContainerMap}>{activePage.component}</div>;
      }
      return <div className={styles.pageContainer}>{activePage.component}</div>;
    }

    // '준비중' 페이지
    return (
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>{activePage ? activePage.name : '준비중'}</h1>
        <p>준비 중인 페이지입니다.</p>
      </div>
    );
  };

  return (
    // '헤더/본문/푸터' 레이아웃
    <div className={styles.layoutContainer}>
      
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

      <main className={styles.contentArea}>
        {renderPageContent()}
      </main>

      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} 사장님 CRM. All rights reserved. (21일차 '고객 탭' 분리)
        </p>
      </footer>

    </div>
  );
}