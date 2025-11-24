import React from 'react';
// ▼ 여기가 수정되었습니다 (점 4개!)
import { useMap } from '../../../../contexts/MapContext';
import styles from '../../styles/MapOverlays.module.css';

export default function RoadviewCloseButton() {
  const { roadviewMode, setRoadviewMode } = useMap();

  if (roadviewMode === 'OFF') return null;

  return (
    <button
      className={styles.roadviewCloseButton}
      onClick={() => setRoadviewMode('OFF')}
      title="로드뷰 닫기"
    >
      &times;
    </button>
  );
}