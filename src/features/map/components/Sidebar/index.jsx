import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
import styles from '../../styles/MapSidebar.module.css';
import PinForm from './PinForm';
import PinDetail from './PinDetail';
import ProposalList from './ProposalList'; // ★ 새로 만든 컴포넌트 import

export default function PinSidebar() {
  const { selectedPin, isEditMode, loading, isGenerating, isProposalOpen } = useMap();

  // 사이드바가 열리는 조건: 매물이 선택되었거나, 제안서 목록이 열려있을 때
  const isOpen = selectedPin || isProposalOpen;

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      {/* 1. 제안서 목록 모드일 때 */}
      {isProposalOpen ? (
        <div className={styles.sidebarContent}>
           <ProposalList />
        </div>
      ) : 
      /* 2. 매물 상세/수정 모드일 때 */
      selectedPin ? (
        <div className={styles.sidebarContent}>
          {(isEditMode || !selectedPin.id) ? <PinForm /> : <PinDetail />}
        </div>
      ) : (
      /* 3. 아무것도 없을 때 */
        <div className={styles.sidebarEmpty}>
          <p>지도를 우클릭하여 새 핀을 등록하거나 매물을 선택하세요.</p>
          {(loading || isGenerating) && <p>데이터 로딩 중...</p>}
        </div>
      )}
    </aside>
  );
}