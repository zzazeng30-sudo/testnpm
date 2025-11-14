// src/components/map/LeftPanel.jsx (수정)
import React from 'react';
import { useMap } from '../../contexts/MapContext'; 
import styles from '../../MapPage.module.css'; 

// ★ (추가) 가격 포맷팅 헬퍼
const formatPriceForList = (pin) => {
  // 숫자 포맷팅 (0이나 null일 경우 0으로)
  const formatNum = (val) => Number(val || 0).toLocaleString();
  const salePrice = pin.sale_price;
  const jeonseDeposit = pin.jeonse_deposit;
  const rentDeposit = pin.rent_deposit;
  const rentAmount = pin.rent_amount;

  if (pin.is_sale && (salePrice !== null && salePrice !== undefined)) {
    return `매) ${formatNum(salePrice)} 만`;
  }
  if (pin.is_jeonse && (jeonseDeposit !== null && jeonseDeposit !== undefined)) {
    return `전) ${formatNum(jeonseDeposit)} 만`;
  }
  if (pin.is_rent) {
    return `월) ${formatNum(rentDeposit)} / ${formatNum(rentAmount)}`;
  }
  return '-'; // 아무것도 해당 안될 시
}


export default function LeftPanel() {
  const {
    mode,
    visiblePins, // ★ pins -> visiblePins
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
    showRoadview, setShowRoadview,
    
    // ★ (제거) 필터 state는 MapPage.jsx로 이동
    // filterPropertyType, setFilterPropertyType,
    // filterTransactionType, setFilterTransactionType,
    // filterStatus, setFilterStatus,

    setAddress, setDetailedAddress, setBuildingName,
    setPropertyType, setPropertyTypeEtc,
    setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium,
    setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus,
    setImageUrls, setImageFiles,
    setValidationErrors,
  } = useMap();

  // --- A. '임장 동선' 모드 ---
  if (mode === 'tour') {
    return (
      <aside className={styles.tourPanel}>
        <h3 className={styles.tourTitle}>
          🚩 임장 동선 최적화 ({tourPins.length})
        </h3>
        
        {/* ★ (제거) 필터 섹션 (MapPage.jsx로 이동) */}

        <div className={styles.tourList}>
          {tourPins.length === 0 && (
            <p className={styles.emptyText}>선택된 핀의 [임장 목록에 추가] 버튼을 눌러 매물을 담아주세요.</p>
          )}
          {tourPins.map((pin, index) => (
            <div key={pin.id} className={styles.tourItem}>
              <span className={styles.tourItemIndex}>{index + 1}</span>
              <span className={styles.tourItemMemo} title={pin.notes || pin.building_name}>
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
        
        {/* ★ (제거) 필터 섹션 (MapPage.jsx로 이동) */}

        <h3 className={styles.manageTitle}>
          🏠 지도 내 매물 ({visiblePins.length})
        </h3>
        <div className={styles.manageList}>
          {visiblePins.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? '매물 로딩 중...' : '지도 범위에 해당하는 매물이 없습니다.'}
            </p>
          )}
          
          {/* ★ (수정) 리스트 아이템 JSX 구조 변경 */}
          {visiblePins.map((pin) => (
            <div 
              key={pin.id} 
              className={styles.manageItem}
              onClick={() => {
                  clearTempMarkerAndMenu(); 
                  setSelectedPin(pin);
                  setAddress(pin.address || '');
                  setDetailedAddress(pin.detailed_address || '');
                  setBuildingName(pin.building_name || '');
                  setPropertyType(pin.property_type || ''); 
                  setPropertyTypeEtc(pin.property_type_etc || ''); 
                  setIsSale(pin.is_sale || false);
                  setSalePrice(pin.sale_price !== null ? String(pin.sale_price) : ''); 
                  setIsJeonse(pin.is_jeonse || false);
                  setJeonseDeposit(pin.jeonse_deposit !== null ? String(pin.jeonse_deposit) : ''); 
                  setJeonsePremium(pin.jeonse_premium !== null ? String(pin.jeonse_premium) : ''); 
                  setIsRent(pin.is_rent || false);
                  setRentDeposit(pin.rent_deposit !== null ? String(pin.rent_deposit) : ''); 
                  setRentAmount(pin.rent_amount !== null ? String(pin.rent_amount) : ''); 
                  setKeywords(pin.keywords || '');
                  setNotes(pin.notes || '');
                  setStatus(pin.status || '거래전');
                  setImageUrls(pin.image_urls || ['', '', '']);
                  setImageFiles([null, null, null]);
                  setValidationErrors([]); 
                  fetchLinkedCustomers(pin.id);
                  setImContent(null);
                  if (mapInstanceRef.current && window.kakao) {
                      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
                  }
              }}
            >
              {/* 1. 왼쪽 (주소, 키워드) */}
              <div className={styles.manageItemLeft}>
                <span className={styles.manageItemAddress} title={pin.address}>
                  {/* ★ (수정) 주소 또는 건물명, 둘 다 없으면 '주소 없음' */}
                  {pin.address || pin.building_name || '주소 없음'}
                </span>
                <span className={styles.manageItemKeywords} title={pin.keywords}>
                  {pin.keywords || '키워드 없음'}
                </span>
              </div>
              
              {/* 2. 오른쪽 (가격) */}
              <span className={styles.manageItemPrice}>
                {formatPriceForList(pin)}
              </span>
            </div>
          ))}
          {/* ★ (여기까지 수정) */}
        </div>

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