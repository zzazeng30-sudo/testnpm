import React from 'react';
// ▼ 여기가 수정되었습니다 (점 4개!)
import { useMap } from '../../../../contexts/MapContext';
import styles from "../../pages/MapPage.module.css";

export default function MapContextMenu() {
  const { contextMenu, contextMenuRef, handleContextMenuAction, mapRef, loading, isGenerating } = useMap();

  if (!contextMenu.visible) return null;

  const getPositionStyle = () => {
    if (!mapRef.current || !mapRef.current.parentElement) return {};
    const mapSectionOffsetLeft = mapRef.current.parentElement.offsetLeft;
    
    if (contextMenu.pinId) {
      return {
        top: `calc(50% - 100px)`,
        left: `calc(50% + ${mapSectionOffsetLeft}px + 30px)`
      };
    } else {
      return {
        top: `${contextMenu.y}px`,
        left: `${contextMenu.x + mapSectionOffsetLeft}px`
      };
    }
  };

  return (
    <div ref={contextMenuRef} className={styles.contextMenu} style={getPositionStyle()}>
      {contextMenu.pinId ? (
        <>
          <button onClick={() => handleContextMenuAction('editPin')}>매물 수정 (사이드바)</button>
          <button onClick={() => handleContextMenuAction('deletePin')} disabled={loading || isGenerating || contextMenu.isStack}>매물 삭제</button>
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
          <button onClick={() => handleContextMenuAction('addPinToStack')} disabled={loading || isGenerating}>매물 스택 추가</button>
          {contextMenu.isStack && (
             <button onClick={() => handleContextMenuAction('editPin')} disabled={loading} style={{ marginTop: '0.5rem' }}>
               📍 스택 매물 보기
             </button>
          )}
        </>
      ) : (
        <>
          <button onClick={() => handleContextMenuAction('createPin')}>임장 등록 (핀 생성)</button>
          <button disabled>예시 2 (준비중)</button>
        </>
      )}
    </div>
  );
}