/**
 * [Revision Info]
 * Rev: 63.0 (Mobile UX: Initial State Minimized)
 * - 모바일 첫 로딩 시 하단 시트가 닫힌(Minimized) 상태로 시작하도록 수정
 */
import React, { useState, useEffect } from 'react';
import { MapProvider, useMap } from '../02_Contexts/MapContext';
import KakaoMap from '../03_Sections/01_MapArea/KakaoMap';
import LeftPanel from '../03_Sections/03_Sidebar/LeftPanel';
import PinSidebar from '../03_Sections/03_Sidebar/index';
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
    isCreating 
  } = useMap(); 

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  // ★ [수정] 초기 상태를 true(최소화)로 설정하여 로딩 시 패널이 닫혀있게 합니다.
  const [isMinimized, setIsMinimized] = useState(true); 

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // 데스크탑으로 전환될 때는 최소화 상태가 의미 없으므로 초기화할 수 있습니다.
      if (!mobile) setIsMinimized(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [기능] 상태 변화에 따른 시트 제어
  useEffect(() => {
    if (isMobile) {
      if (isCreating) {
        // 매물 등록 모드일 때는 입력을 위해 시트를 펼칩니다.
        setIsMinimized(false);
      } else {
        // 그 외 매물 선택이나 일반 상태에서는 닫힘(최소화) 상태를 유지하거나 강제합니다.
        setIsMinimized(true);
      }
    }
  }, [selectedPin, isCreating, isMobile]);

  return (
    <div className={styles.pageContainerMap}
     style={{
      
      }}
      >
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
            {/* 시각적으로 잡고 끌 수 있는 느낌을 주는 핸들바 추가 */}
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
        <LeftPanel />
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

      {/* PC와 모바일의 상세/등록 뷰어 분리 */}
      {isMobile ? <PinSidebar /> : <RightPanel />}
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
