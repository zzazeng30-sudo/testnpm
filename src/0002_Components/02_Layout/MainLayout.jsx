import React, { useState, useEffect } from 'react';
import { supabase } from '../../0005_Lib/supabaseClient';

// CSS Module 임포트
import styles from './MainLayout.module.css';

// 페이지 컴포넌트들
import MapPage from '../../0004_Features/006_Map/01_Pages/MapPage';
import CustomerPage from '../../0004_Features/004_Customer/CustomerPage';
import ContractPage from '../../0004_Features/003_Contract/ContractPage';
import DashboardPage from '../../0004_Features/005_Dashboard/DashboardPage';
import MyPage from '../../0004_Features/007_MyPage/MyPage';
import ConsultationLogPage from '../../0004_Features/002_Consultation/ConsultationLogPage';
import PropertyPage from '../../0004_Features/008_Property/PropertyPage';
import LandAnalysisPage from '../../0004_Features/009_Analysis/LandAnalysisPage';

// [경로 확인] 관리자 페이지 (폴더명 010_Admin)
import AdminPage from '../../0004_Features/010_Admin/AdminPage';

// 기본 메뉴 데이터 (일반 사용자용)
const baseMenuData = {
  '대시보드': [
    { id: 'dashboard-schedule', name: '스케줄표', component: <DashboardPage />, icon: '📊' },
    { id: 'dashboard-list', name: '매물 등록', component: <PropertyPage />, isMap: true, icon: '📝' },
  ],
  '매물': [
    { id: 'prop-map', name: '매물 지도', component: <MapPage />, isMap: true, mode: 'manage', icon: '📍' },
    { id: 'prop-list', name: '매물 리스트', component: <PropertyPage />, isMap: true, icon: '📋' },
    { id: 'prop-analysis', name: '지적분석', component: <LandAnalysisPage />, isMap: true, icon: '🔍' },
  ],
  '고객': [
    { id: 'cust-add', name: '고객 추가', icon: '➕' }, 
    { id: 'cust-manage', name: '고객 관리', component: <CustomerPage />, isMap: true, icon: '👥' },
    { id: 'cust-log', name: '상담 관리', component: <ConsultationLogPage />, isMap: true, icon: '💬' },
  ],
  '계약': [
    { id: 'cont-list', name: '계약 리스트', component: <ContractPage />, isMap: true, icon: '🤝' },
  ],
  '마이페이지': [
    { id: 'my-info', name: '내정보 수정', component: <MyPage />, isMyPage: true, icon: '👤' },
  ]
};

// 기본 메인 메뉴 목록
const baseMainMenus = [
  { name: '대시보드', icon: '🏠' },
  { name: '매물', icon: '🏢' },
  { name: '고객', icon: '👥' },
  { name: '계약', icon: '📄' },
  { name: '마이페이지', icon: '⚙️' }
];

export default function MainLayout({ session, userProfile }) {
  // [디버깅] 현재 로그인한 사람의 정보와 권한을 콘솔에 찍어봅니다.
  // F12 -> Console 탭에서 확인 가능합니다.
  console.log("🕵️‍♂️ [MainLayout] 전달받은 프로필:", userProfile);

  const [activeMainMenu, setActiveMainMenu] = useState('매물');
  const [activeSubMenu, setActiveSubMenu] = useState('prop-map');
  const [customerModalTrigger, setCustomerModalTrigger] = useState(0);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // [수정] 관리자 권한 확인 (유연한 비교)
  // userProfile이 존재하고, role이 숫자 0 이거나 문자 '0' 일 때 모두 허용 (== 사용)
  const isAdmin = userProfile && userProfile.role == 0;

  // 메뉴 데이터 동적 구성
  // 객체와 배열을 복사해서 사용 (원본 훼손 방지)
  let menuData = { ...baseMenuData };
  let mainMenus = [ ...baseMainMenus ];

  if (isAdmin) {
    // 1. 메인 메뉴바에 '관리자' 추가
    // 중복 추가 방지를 위해 이미 있는지 확인
    const hasAdminMenu = mainMenus.some(m => m.name === '관리자');
    if (!hasAdminMenu) {
      mainMenus.push({ name: '관리자', icon: '🔒' });
    }
    
    // 2. 서브 메뉴 데이터에 '관리자' 내용 추가
    menuData['관리자'] = [
      { id: 'admin-main', name: '회원 승인', component: <AdminPage />, icon: '✅' }
    ];
  }

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const currentSubList = menuData[activeMainMenu] || [];
  
  const currentPage = (activeSubMenu === 'cust-add' || activeSubMenu === 'cust-manage')
    ? currentSubList.find(m => m.id === 'cust-manage') 
    : (currentSubList.find(m => m.id === activeSubMenu) || currentSubList[0]);

  const isMapMode = currentPage?.isMap;

  return (
    <div className={styles.layout}>
      {/* 1. 메인 메뉴 바 */}
      <header className={`${styles.mainBar} ${styles.noScrollbar}`}>
        {mainMenus.map(m => (
          <button 
            key={m.name} 
            className={`${styles.tab} ${activeMainMenu === m.name ? styles.tabActive : ''}`}
            onClick={() => { 
              setActiveMainMenu(m.name); 
              // 탭 변경 시 해당 탭의 첫 번째 서브메뉴를 자동으로 선택
              if (menuData[m.name] && menuData[m.name].length > 0) {
                setActiveSubMenu(menuData[m.name][0].id);
              }
              setIsCustomerModalVisible(false);
            }}
          >
            {isMobile && <span style={{ fontSize: '20px' }}>{m.icon}</span>}
            <span>{m.name}</span>
          </button>
        ))}
      </header>

      {/* 2. 서브 메뉴 바 */}
      <nav className={`${styles.subBar} ${styles.noScrollbar}`}>
        {currentSubList.map(sub => {
          let isTabActive = activeSubMenu === sub.id;
          if (sub.id === 'cust-add') isTabActive = isCustomerModalVisible;
          if (sub.id === 'cust-manage') isTabActive = (activeSubMenu === 'cust-manage' && !isCustomerModalVisible);

          return (
            <button 
              key={sub.id} 
              className={`${styles.subTab} ${isTabActive ? styles.subTabActive : ''}`}
              onClick={() => {
                if(sub.id === 'cust-add') {
                  setActiveSubMenu('cust-manage');
                  setCustomerModalTrigger(prev => prev + 1);
                  setIsCustomerModalVisible(true);
                } else {
                  setActiveSubMenu(sub.id);
                  setIsCustomerModalVisible(false);
                }
              }}
            >
              {isMobile && <span style={{ marginRight: '4px' }}>{sub.icon}</span>}
              {sub.name}
            </button>
          );
        })}
      </nav>

      {/* 3. 메인 컨텐츠 영역 */}
      <main 
        key={activeSubMenu} 
        className={`${styles.content} ${isMapMode ? styles.contentMapMode : ''}`}
      >
        {currentPage?.component && React.cloneElement(currentPage.component, { 
          session,
          userProfile, // 하위 컴포넌트에서도 프로필 정보가 필요할 수 있으니 전달
          modalTrigger: customerModalTrigger,
          onModalClose: () => { setIsCustomerModalVisible(false); setCustomerModalTrigger(0); }
        })}
      </main>
    </div>
  );
}