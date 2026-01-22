// src/0004_Features/006_Map/03_Sections/02_Overlays/RoadviewCloseButton.jsx
import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
// ★ 수정됨: pages -> 01_Pages
import styles from "../../01_Pages/MapOverlays.module.css";

export default function RoadviewCloseButton() {
  const { toggleRoadview } = useMap();

  return (
    <button 
      className={styles.roadviewCloseBtn} 
      onClick={() => toggleRoadview('OFF')}
    >
      로드뷰 닫기
    </button>
  );
}