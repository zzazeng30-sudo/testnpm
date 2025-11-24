import React from 'react';
import { MapProvider, useMap } from '../../../contexts/MapContext';

// ▼ [수정] 스타일 파일 분리 import
import layoutStyles from '../styles/MapLayout.module.css';     // 레이아웃 (pageContainerMap)
import sidebarStyles from '../styles/MapSidebar.module.css';   // 사이드바 (tourPanel, managePanel)
import overlayStyles from '../styles/MapOverlays.module.css';  // 오버레이 (panelToggleButton)

// Components
import LeftPanel from '../../../components/map/LeftPanel'; 
import KakaoMap from '../../../components/map/KakaoMap';
import PinSidebar from '../components/Sidebar';
import MapFilters from '../components/Overlays/MapFilters';
import MapControls from '../components/Overlays/MapControls';
import MapContextMenu from '../components/Overlays/MapContextMenu';
import RoadviewCloseButton from '../components/Overlays/RoadviewCloseButton';
import ImAnalysisModal from '../components/Modals/ImAnalysisModal';
import ImageViewerModal from '../components/Modals/ImageViewerModal';

// 1. 껍데기 컴포넌트
export default function MapPage({ session, mode = 'tour' }) {
  return (
    <MapProvider session={session} mode={mode}>
      <MapPageContent />
    </MapProvider>
  );
}

// 2. 실제 내용 컴포넌트
function MapPageContent() {
  const { isLeftPanelOpen, setIsLeftPanelOpen, mode } = useMap();

  const leftPanelStyle = {
    left: isLeftPanelOpen ? '0' : '-20rem',
    transition: 'left 0.3s ease-in-out',
  };
  const toggleButtonStyle = {
    left: isLeftPanelOpen ? '20rem' : '0',
    transition: 'left 0.3s ease-in-out',
  };

  return (
    // ▼ [수정] styles.pageContainerMap -> layoutStyles.pageContainerMap
    <div className={layoutStyles.pageContainerMap}>
      
      {/* 왼쪽 패널 & 토글 */}
      <div 
        style={leftPanelStyle} 
        // ▼ [수정] styles.tourPanel -> sidebarStyles.tourPanel
        className={mode === 'tour' ? sidebarStyles.tourPanel : sidebarStyles.managePanel}
      >
        <LeftPanel />
      </div>
      <button
        // ▼ [수정] styles.panelToggleButton -> overlayStyles.panelToggleButton
        className={overlayStyles.panelToggleButton}
        style={toggleButtonStyle}
        onClick={() => setIsLeftPanelOpen(prev => !prev)}
        title={isLeftPanelOpen ? "패널 접기" : "패널 펼치기"}
      >
        {isLeftPanelOpen ? '◀' : '▶'}
      </button>

      {/* 오른쪽 사이드바 */}
      <PinSidebar />

      {/* 지도 */}
      <KakaoMap />

      {/* 지도 위 오버레이들 */}
      <MapFilters />
      <MapControls />
      <RoadviewCloseButton />
      <MapContextMenu /> 

      {/* 모달 */}
      <ImAnalysisModal />
      <ImageViewerModal />

    </div>
  );
}