// src/components/map/LeftPanel.jsx (수정)
import React from 'react';
// ★ 21일차 (수정): '../../' 경로 수정
import { useMap } from '../../contexts/MapContext'; 
import styles from '../../MapPage.module.css'; 

export default function LeftPanel() {
  // ★ '뇌'에서 필요한 데이터와 기능만 가져옴
  const {
    mode,
    pins,
    tourPins,
    loading,
    isGenerating,
    handleRemoveFromTour,
    handleClearTour,
    handleOptimizeTour,
    clearTempMarkerAndMenu,
    setSelectedPin,
    setEditMemo,
    setEditPrice,
    fetchLinkedCustomers,
    setImContent,
    mapInstanceRef
  } = useMap();

  // --- A. '매물 지도' 모드 (기본) ---
  if (mode === 'tour') {
    return (
      <aside className={styles.tourPanel}>
        <h3 className={styles.tourTitle}>
          🚩 임장 동선 최적화 ({tourPins.length})
        </h3>
        <div className={styles.tourList}>
          {tourPins.length === 0 && (
            <p className={styles.emptyText}>선택된 핀의 [임장 목록에 추가] 버튼을 눌러 매물을 담아주세요.</p>
          )}
          {tourPins.map((pin, index) => (
            <div key={pin.id} className={styles.tourItem}>
              <span className={styles.tourItemIndex}>{index + 1}</span>
              <span className={styles.tourItemMemo} title={pin.memo}>
                {pin.memo.length > 15 ? `${pin.memo.substring(0, 15)}...` : pin.memo}
              </span>
              <button 
                onClick={() => handleRemoveFromTour(pin.id)}
                className={styles.tourRemoveButton}
                disabled={loading || isGenerating}
              >
                제거
              </button>
            </div>
          ))}
        </div>
        <div className={styles.tourButtonContainer}>
          <button
            onClick={handleClearTour}
            className={`${styles.button} ${styles.buttonGray}`}
            disabled={loading || isGenerating || tourPins.length === 0}
          >
            초기화
          </button>
          <button
            onClick={handleOptimizeTour}
            className={`${styles.button} ${styles.buttonOrange}`}
            disabled={loading || isGenerating || tourPins.length < 2}
          >
            {loading ? '...' : '경로 최적화'}
          </button>
        </div>
      </aside>
    );
  }

  // --- B. '매물 관리' 모드 ---
  if (mode === 'manage') {
    return (
      <aside className={styles.managePanel}> 
        <h3 className={styles.manageTitle}>
          🏠 전체 매물 리스트 ({pins.length})
        </h3>
        <div className={styles.manageList}>
          {pins.length === 0 && (
            <p className={styles.emptyText}>등록된 매물이 없습니다. 지도에서 우클릭하여 핀을 등록하세요.</p>
          )}
          {pins.map((pin) => (
            <div 
              key={pin.id} 
              className={styles.manageItem}
              onClick={() => {
                  clearTempMarkerAndMenu(); 
                  setSelectedPin(pin);
                  setEditMemo(pin.memo || '');
                  setEditPrice(pin.price || 0);
                  fetchLinkedCustomers(pin.id);
                  setImContent(null);
                  if (mapInstanceRef.current && window.kakao) {
                      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
                  }
              }}
            >
              <span className={styles.manageItemMemo} title={pin.memo}>
                {pin.memo || '메모 없음'}
              </span>
              <span className={styles.manageItemPrice}>
                {pin.price ? `${pin.price.toLocaleString()} 만원` : '-'}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.manageButtonContainer}>
           <p className={styles.manageInfoText}>
              * 새 매물 등록은 [매물 리스트] 탭에서 주소로 등록할 수 있습니다.
           </p>
        </div>
      </aside>
    );
  }
  
  return null;
}