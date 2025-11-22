import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
// ▼ [수정] 경로 변경
import styles from '../../pages/MapPage.module.css';

export default function MapControls() {
  const { activeMapType, setActiveMapType, roadviewMode, toggleRoadview } = useMap();

  return (
    <div className={styles.mapControlContainer}>
      <button className={`${styles.mapControlButton} ${activeMapType === 'NORMAL' ? styles.active : ''}`} onClick={() => setActiveMapType('NORMAL')}>지도</button>
      <button className={`${styles.mapControlButton} ${activeMapType === 'SKYVIEW' ? styles.active : ''}`} onClick={() => setActiveMapType('SKYVIEW')}>스카이뷰</button>
      <button className={`${styles.mapControlButton} ${activeMapType === 'CADASTRAL' ? styles.active : ''}`} onClick={() => setActiveMapType('CADASTRAL')}>지적도</button>
      {/* toggleRoadview 함수에 인자가 필요하다면 화살표 함수로 감싸주세요 */}
      <button className={`${styles.mapControlButton} ${roadviewMode === 'MAP' ? styles.active : ''}`} onClick={() => toggleRoadview('MAP')}>로드뷰</button>
    </div>
  );
}