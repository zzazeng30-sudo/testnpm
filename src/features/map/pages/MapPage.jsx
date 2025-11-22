import React from 'react';
import { MapProvider, useMap } from '../../../contexts/MapContext'; // ★ 경로 수정됨
import styles from './MapPage.module.css';

// --- 1. 기존 컴포넌트 (src/components/map 에 있는 것들) ---
import LeftPanel from '../../../components/map/LeftPanel';
import KakaoMap from '../../../components/map/KakaoMap';

// --- 2. 새로 만든 컴포넌트 (src/features/map 에 있는 것들) ---
import PinSidebar from '../components/Sidebar'; // index.jsx 자동 로드
import MapFilters from '../components/Overlays/MapFilters';
import MapControls from '../components/Overlays/MapControls';
import MapContextMenu from '../components/Overlays/MapContextMenu';
import RoadviewCloseButton from '../components/Overlays/RoadviewCloseButton';

// --- 3. 모달 컴포넌트 ---
import ImAnalysisModal from '../components/Modals/ImAnalysisModal';
import ImageViewerModal from '../components/Modals/ImageViewerModal';

// 껍데기 컴포넌트 (Provider 제공)
export default function MapPage({ session, mode = 'tour' }) {
  return (
    <MapProvider session={session} mode={mode}>
      <MapPageContent />
    </MapProvider>
  );
}

// 실제 화면 구성
function MapPageContent() {
  const { isLeftPanelOpen, setIsLeftPanelOpen, mode } = useMap();

  // 왼쪽 패널 애니메이션 스타일
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
      
      {/* 1. 왼쪽 리스트 패널 */}
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

      {/* 2. 오른쪽 상세정보 사이드바 */}
      <PinSidebar />

      {/* 3. 메인 지도 */}
      <KakaoMap />

      {/* 4. 지도 위 컨트롤 & 오버레이 */}
      <MapFilters />
      <MapControls />
      <RoadviewCloseButton />

      {/* 5. 각종 팝업 (조건부 렌더링은 내부에서 처리됨) */}
      <MapContextMenu />
      <ImAnalysisModal />
      <ImageViewerModal />

    </div>
  );
}