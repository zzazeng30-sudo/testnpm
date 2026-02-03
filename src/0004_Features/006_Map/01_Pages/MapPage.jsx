/**
 * [Revision Info]
 * Rev: 64.0 (Mobile UX: Dynamic Panel Switching)
 * - 모바일 하단 시트에서 LeftPanel(목록)과 RightPanel(상세)을 조건부 렌더링하도록 수정
 * - 매물 선택 시 시트 자동 확장 로직 추가
 */
import React, { useState, useEffect } from 'react';
import { MapProvider, useMap } from '../02_Contexts/MapContext';
import KakaoMap from '../03_Sections/01_MapArea/KakaoMap';
import LeftPanel from '../03_Sections/03_Sidebar/LeftPanel';
// import PinSidebar from '../03_Sections/03_Sidebar/index'; // ★ [수정] 더 이상 사용하지 않음 (RightPanel로 대체)
import RightPanel from '../03_Sections/03_Sidebar/RightPanel';
import MapFilters from '../03_Sections/02_Overlays/MapFilters';
import MapControls from '../03_Sections/02_Overlays/MapControls';
import MapContextMenu from '../03_Sections/02_Overlays/MapContextMenu';
import RoadviewPanel from '../03_Sections/03_Sidebar/RoadviewPanel';

import styles from './MapLayout.module.css';
import overlayStyles from './MapOverlays.module.css';

function MapPageContent() {
  const { 
    isLeftPanelOpen, 
    isRoadviewMode, 
    roadviewPosition,
    selectedPin,
    isCreating,
    isEditMode // ★ [수정] 수정 모드 감지를 위해 추가
  } = useMap(); 

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMinimized, setIsMinimized] = useState(true); 

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsMinimized(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ★ [수정] 상태 변화에 따른 시트 제어 (핀 선택 시에도 열리도록 변경)
  useEffect(() => {
    if (isMobile) {
      // 매물 선택(selectedPin), 등록(isCreating), 수정(isEditMode) 중 하나라도 해당되면 시트 열기
      if (selectedPin || isCreating || isEditMode) {
        setIsMinimized(false);
      } else {
        // 아무것도 선택 안 된 목록 상태면 최소화(닫힘) 상태 유지
        setIsMinimized(true);
      }
    }
  }, [selectedPin, isCreating, isEditMode, isMobile]);

  // ★ [수정] 모바일에서 상세 화면(RightPanel)을 보여줄지 결정하는 변수
  const showMobileDetail = isMobile && (!!selectedPin || isCreating || isEditMode);

  return (
    <div className={styles.pageContainerMap}>
      <div className={`
        ${styles.sidebar} 
        ${isLeftPanelOpen ? styles.sidebarOpen : styles.sidebarClosed}
        ${isMobile ? (isMinimized ? styles.sidebarMinimized : styles.sidebarExpanded) : ''}
      `}>
        {isMobile && (
          <div 
            className={styles.handleBar} 
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "열기" : "접기"}
          >
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#ddd',
              borderRadius: '2px',
              margin: '0 auto 5px'
            }} />
            <div className={`${styles.arrowIcon} ${isMinimized ? styles.arrowUp : ''}`} />
          </div>
        )}

        {/* ★ [수정] 조건부 렌더링: 상세 정보가 필요하면 RightPanel, 아니면 LeftPanel 표시 */}
        {showMobileDetail ? (
           // 모바일용 RightPanel에는 isMobile props를 전달하여 스타일을 조정합니다.
           <RightPanel isMobile={true} />
        ) : (
           <LeftPanel />
        )}
      </div>

      <div className={styles.mapSection} style={{ position: 'relative' }}>
        <div className={overlayStyles.topFilterBar}>
          <MapFilters />
        </div>
        
        <KakaoMap />
        
        <MapControls />
        <MapContextMenu />

        {isRoadviewMode && roadviewPosition && (
          <RoadviewPanel />
        )}
      </div>

      {/* ★ [수정] 모바일이 아닐 때만 우측 패널을 별도로 표시 */}
      {!isMobile && <RightPanel />}
    </div>
  );
}

export default function MapPage({ session }) {
  return (
    <MapProvider session={session}>
      <MapPageContent />
    </MapProvider>
  );
}
