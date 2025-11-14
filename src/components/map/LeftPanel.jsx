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
    // ★ (수정) visiblePins에서 스택 정보 사용
    visiblePins, 
    listTitle, // ★ (추가) 스태킹용 리스트 제목
    
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
    
    // ★ (제거) 필터 state (MapPage.jsx로 이동)
    // filterPropertyType, setFilterPropertyType,
    // filterTransactionType, setFilterTransactionType,
    // filterStatus, setFilterStatus,
    
    // ★ (추가) 스태킹 리스트 강제용
    isListForced, setIsListForced,
    setVisiblePins, // 스택 클릭 시 사용
    setListTitle,   // 스택 클릭 시 사용

    setAddress, setDetailedAddress, setBuildingName,
    setPropertyType, setPropertyTypeEtc,
    setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium,
    setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus,
    setImageUrls, setImageFiles,
    setValidationErrors,
    
    setIsEditMode // ★ (추가)
  } = useMap();
  
  // ★ (제거) 필터 JSX (MapPage.jsx로 이동)

  // --- A. '임장 동선' 모드 ---
  if (mode === 'tour') {
    return (
      <aside className={styles.tourPanel}>
        <h3 className={styles.tourTitle}>
          🚩 임장 동선 최적화 ({tourPins.length})
        </h3>
        
        {/* ★ (제거) 필터 섹션 */}

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
        
        {/* ★ (제거) 필터 섹션 */}

        <h3 className={styles.manageTitle}>
          {/* ★ (수정) 스태킹 제목 / 지도 내 매물 제목 분기 */}
          🏠 {listTitle} ({visiblePins.length})
        </h3>
        <div className={styles.manageList}>
          {visiblePins.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? '매물 로딩 중...' : '지도 범위에 해당하는 매물이 없습니다.'}
            </p>
          )}
          
          {/* ★ (수정) 리스트 아이템 JSX 구조 변경 + 스태킹 클릭 로직 */}
          {visiblePins.map((pin) => (
            <div 
              key={pin.id} 
              className={styles.manageItem}
              // ★ (수정) 스택인지 일반 핀인지에 따라 다른 클릭 이벤트
              onClick={() => {
                  clearTempMarkerAndMenu(); 
                  
                  // 1. 스택(묶음)을 클릭한 경우
                  if (pin.isStack) {
                      setIsListForced(true); // 리스트 강제
                      setListTitle(`[${pin.count}개] ${pin.address}`); // 제목 변경
                      setVisiblePins(pin.pins); // 리스트를 스택 내부 핀으로 교체
                      setSelectedPin(null); // 사이드바 닫기
                      if (mapInstanceRef.current && window.kakao) {
                          mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
                      }
                  } 
                  // 2. 일반 핀을 클릭한 경우
                  else {
                      // (스택 리스트를 보고 있다가 핀을 누른 경우 대비)
                      if(isListForced) {
                          setIsListForced(false);
                          setListTitle("지도 내 매물");
                          // (리스트 갱신은 handleMapMove가 처리)
                      }
                      
                      setSelectedPin(pin);
                      setIsEditMode(false); // ★ 읽기 모드로 열기
                      
                      // 폼 데이터 채우기
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
                  }
              }}
            >
              {/* 1. 왼쪽 (주소, 키워드) */}
              <div className={styles.manageItemLeft}>
                <span className={styles.manageItemAddress} title={pin.address}>
                  {/* ★ (수정) 핀이 스택이면 주황색으로 표시 */}
                  {pin.isStack && '📍 '}
                  {pin.address || '주소 없음'}
                </span>
                <span className={styles.manageItemKeywords} title={pin.keywords}>
                  {pin.keywords || '키워드 없음'}
                </span>
              </div>
              
              {/* 2. 오른쪽 (가격) */}
              <span className={styles.manageItemPrice}>
                {/* ★ (수정) 스택이 아닐 때만 가격 표시 */}
                {!pin.isStack ? formatPriceForList(pin) : ''}
              </span>
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

        <div className={styles.manageButtonContainer}>
           <p className={styles.manageInfoText}>
              * 새 매물 등록은 지도 우클릭
           </p>
        </div>
      </aside>
    );
  }
  
  return null;
}