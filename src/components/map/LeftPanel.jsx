// src/components/map/LeftPanel.jsx (수정)
import React from 'react';
// ★ 21일차 (수정): '../../' 경로 수정
import { useMap } from '../../contexts/MapContext'; 
import styles from '../../MapPage.module.css'; 

export default function LeftPanel() {
  // ★ (수정) '뇌'에서 필요한 데이터와 기능을 모두 가져옵니다.
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
    fetchLinkedCustomers,
    setImContent,
    mapInstanceRef,

    // ★ (수정) showCadastral 대신 showRoadview 사용
    showRoadview, setShowRoadview,

    // ★ (추가) 새 폼 state setters
    setAddress, setDetailedAddress, setBuildingName,
    setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium,
    setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus,
    setImageUrls, setImageFiles
  } = useMap();

  // --- A. '임장 동선' 모드 ---
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
              <span className={styles.tourItemMemo} title={pin.notes || pin.building_name}>
                {/* ★ (수정) pin.memo 대신 pin.building_name 또는 pin.notes 사용 */}
                {(pin.building_name || pin.notes || '이름 없음').length > 15 
                  ? `${(pin.building_name || pin.notes || '이름 없음').substring(0, 15)}...` 
                  : (pin.building_name || pin.notes || '이름 없음')}
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
        
        {/* ★ (수정) '지적도' 버튼을 '로드뷰' 버튼으로 교체 */}
        <div className={styles.layerToggleContainer}>
          <button
            onClick={() => setShowRoadview(prev => !prev)}
            className={`${styles.button} ${showRoadview ? styles.buttonBlue : styles.buttonGray}`}
          >
            {showRoadview ? '로드뷰 끄기' : '로드뷰 켜기'}
          </button>
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

                  // ★ (수정) setEditMemo/Price 대신 새 폼 state로 모두 채우기
                  setAddress(pin.address || '');
                  setDetailedAddress(pin.detailed_address || '');
                  setBuildingName(pin.building_name || '');
                  setIsSale(pin.is_sale || false);
                  setSalePrice(pin.sale_price || '');
                  setIsJeonse(pin.is_jeonse || false);
                  setJeonseDeposit(pin.jeonse_deposit || '');
                  setJeonsePremium(pin.jeonse_premium || '');
                  setIsRent(pin.is_rent || false);
                  setRentDeposit(pin.rent_deposit || '');
                  setRentAmount(pin.rent_amount || '');
                  setKeywords(pin.keywords || '');
                  setNotes(pin.notes || '');
                  setStatus(pin.status || '거래전');
                  setImageUrls(pin.image_urls || ['', '', '']);
                  setImageFiles([null, null, null]);

                  fetchLinkedCustomers(pin.id);
                  setImContent(null);
                  if (mapInstanceRef.current && window.kakao) {
                      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
                  }
              }}
            >
              <span className={styles.manageItemMemo} title={pin.notes}>
                {/* ★ (수정) pin.memo 대신 pin.building_name 또는 pin.notes */}
                {pin.building_name || pin.notes || '메모 없음'}
              </span>
              <span className={styles.manageItemPrice}>
                {/* ★ (수정) pin.price 대신 거래 유형별 가격 표시 */}
                {pin.is_sale && pin.sale_price ? `${pin.sale_price.toLocaleString()} 만원` : 
                 (pin.is_jeonse && pin.jeonse_deposit ? `${pin.jeonse_deposit.toLocaleString()} 만원` : 
                 (pin.is_rent && pin.rent_amount ? `${pin.rent_deposit}/${pin.rent_amount}` : '-'))}
              </span>
            </div>
          ))}
        </div>

        {/* ★ (수정) '지적도' 버튼을 '로드뷰' 버튼으로 교체 */}
        <div className={styles.layerToggleContainer}>
          <button
            onClick={() => setShowRoadview(prev => !prev)}
            className={`${styles.button} ${showRoadview ? styles.buttonBlue : styles.buttonGray}`}
          >
            {showRoadview ? '로드뷰 끄기' : '로드뷰 켜기'}
          </button>
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