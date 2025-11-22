import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
// ▼ [수정] 경로 변경 (../../pages/...)
import styles from '../../pages/MapPage.module.css';
import PinForm from './PinForm';
import PinDetail from './PinDetail';

export default function PinSidebar() {
  const { selectedPin, isEditMode, loading, isGenerating } = useMap();

  return (
    <aside className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}>
      {selectedPin ? (
        <div className={styles.sidebarContent}>
          {(isEditMode || !selectedPin.id) ? <PinForm /> : <PinDetail />}
        </div>
      ) : (
        <div className={styles.sidebarEmpty}>
          <p>지도를 우클릭하여 새 핀을 등록하세요.</p>
          {(loading || isGenerating) && <p>데이터 로딩 중...</p>}
        </div>
      )}
    </aside>
  );
}