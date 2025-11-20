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

// ★ [모달] 1. '고객 추가', '고객 관리', '상담 관리' 3개 탭으로 구성
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
  ],
  '고객': [
    { id: 'cust-upload', name: '고객 추가' }, // (컴포넌트 없음, 클릭 시 트리거 역할)
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true },
    { id: 'cust-log', name: '상담 관리', component: <ConsultationLogPage />, isMap: true }, 
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

  // ★ [모달] 2. '고객 추가' 클릭 시 모달을 열기 위한 '트리거' state
  const [customerModalTrigger, setCustomerModalTrigger] = useState(0);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('로그아웃 오류:', error);
  };

  // ★★★ (수정) '고객' 메인 탭 클릭 시 '고객 관리'로 이동하도록 수정 ★★★
  const handleMainMenuClick = (menuName) => {
    setActiveMainMenu(menuName);
    
    // 1. '고객' 탭을 클릭한 경우
    if (menuName === '고객') {
      setActiveSubMenu('cust-manage'); // 2. '고객 관리' 탭을 기본으로 설정
    } 
    // 3. 그 외 다른 탭은 기존 로직대로 첫 번째 하위 탭을 선택
    else {
      setActiveSubMenu(menuData[menuName][0].id);
    }
  };
  // ★★★ (수정 완료) ★★★


  const handleSubMenuClick = (menuId) => {
    // ★ [모달] 3. '고객 추가' 탭을 클릭했을 때의 특별 로직
    if (menuId === 'cust-upload') {
      setActiveSubMenu('cust-manage'); // 1. '고객 관리' 탭을 활성화
      setCustomerModalTrigger(prev => prev + 1); // 2. 트리거 숫자를 1 증가시켜 모달 열기 신호
    } else {
      setActiveSubMenu(menuId); // 3. 그 외에는 일반 탭 이동
    }
  };

  const renderPageContent = () => {
    const subMenuList = menuData[activeMainMenu];
    let activePage = subMenuList.find(menu => menu.id === activeSubMenu);

    if (activePage && activePage.component) {
      
      let propsToPass = { session };

      if (activePage.isMyPage) {
          const tabId = activePage.id === 'my-info' ? 'info' : 
                        activePage.id === 'my-staff' ? 'staff' : 'info';
          propsToPass.initialTab = tabId;
      } 
      
      if (activePage.mode) {
          propsToPass.mode = activePage.mode;
      }
      
      // ★ [모달] 4. '고객 관리' 탭(CustomerPage)에만 'modalTrigger' prop 전달
      if (activePage.id === 'cust-manage') {
          propsToPass.modalTrigger = customerModalTrigger;
      }

      activePage = {
        ...activePage,
        component: React.cloneElement(activePage.component, propsToPass)
      };
      
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
          &copy; {new Date().getFullYear()} 사장님 CRM. All rights reserved. (고객 관리 모달 적용)
        </p>
      </footer>

    </div>
  );
}