// src/features/map/pages/MapPage.jsx
import React from 'react';
import { MapProvider, useMap } from '../../../contexts/MapContext';
import styles from './MapPage.module.css';

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
    <div className={styles.pageContainerMap}>
      
      {/* 왼쪽 패널 & 토글 */}
      <div style={leftPanelStyle} className={mode === 'tour' ? styles.tourPanel : styles.managePanel}>
        <LeftPanel />
      </div>
      <button
        className={styles.panelToggleButton}
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
      <MapContextMenu /> {/* 위치 계산을 위해 여기 존재해야 함 */}

      {/* 모달 */}
      <ImAnalysisModal />
      <ImageViewerModal />

    </div>
  );
}