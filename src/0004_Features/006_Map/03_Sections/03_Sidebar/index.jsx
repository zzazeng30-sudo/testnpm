/**
 * [Revision Info]
 * Rev: 10.0 (Restore Right Sidebar)
 * * [Restoration]
 * 1. isCreating(등록모드), selectedPin(상세모드), isEditMode(수정모드) 분기 처리 복구
 * 2. PinForm과 PinDetail을 교체하며 표시
 */
import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapPanels.module.css';

import PinDetail from './PinDetail';
import PinForm from './PinForm';

export default function PinSidebar() {
  const { 
    selectedPin, 
    isCreating, 
    isEditMode,
    setIsEditMode,
    setSelectedPin,
    setIsCreating
  } = useMap();

  const handleClose = () => {
    setSelectedPin(null);
    setIsCreating(false);
    setIsEditMode(false);
  };

  // 1. 등록 모드이거나 ID가 없는 임시 핀이면 -> 등록 폼
  const showCreate = isCreating || (selectedPin && !selectedPin.id);
  // 2. 핀이 선택되었고 수정 모드면 -> 수정 폼
  const showEdit = selectedPin && selectedPin.id && isEditMode;
  // 3. 핀이 선택되었고 수정 모드가 아니면 -> 상세 보기
  const showDetail = selectedPin && selectedPin.id && !isEditMode;

  // 아무것도 해당 안되면 렌더링 안 함
  if (!showCreate && !showEdit && !showDetail) return null;

  return (
    <div className={`${styles.managePanel} ${styles.panelOpen}`}>
      {showCreate && (
        <PinForm mode="create" />
      )}

      {showEdit && (
        <PinForm mode="edit" />
      )}

      {showDetail && (
        <PinDetail />
      )}
    </div>
  );
}