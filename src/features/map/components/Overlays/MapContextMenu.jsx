import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
import styles from '../../styles/MapOverlays.module.css';

export default function MapContextMenu() {
  const { contextMenu, contextMenuRef, handleContextMenuAction, mapRef, loading, isGenerating } = useMap();

  if (!contextMenu.visible) return null;

  const getPositionStyle = () => {
    if (!mapRef.current || !mapRef.current.parentElement) return { top: 0, left: 0 };
    
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
          
          {/* ★ [추가] 제안서 담기 (스택 매물 보기 삭제됨) */}
          <button onClick={() => handleContextMenuAction('addToProposal')} disabled={loading || isGenerating}>
             🎁 제안서에 담기 (목록)
          </button>

          <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
          <button onClick={() => handleContextMenuAction('addPinToStack')} disabled={loading || isGenerating}>매물 스택 추가</button>
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