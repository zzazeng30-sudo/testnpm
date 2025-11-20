// src/components/map/LeftPanel.jsx (전체 덮어쓰기)
import React, { useMemo, useState, useEffect } from 'react'; 
import { useMap } from '../../contexts/MapContext'; 
import styles from '../../MapPage.module.css'; 

// ★ (추가) 주소 축약 헬퍼
const abbreviateAddress = (address) => {
  if (!address) return '주소 없음';
  return address
    .replace("충청남도", "충남")
    .replace("충청북도", "충북")
    .replace("경상남도", "경남")
    .replace("경상북도", "경북")
    .replace("전라남도", "전남")
    .replace("전라북도", "전북")
    .replace("경기도", "경기")
    .replace("강원도", "강원")
    .replace("제주특별자치도", "제주");
};

// ★ (추가) 가격 포맷팅 헬퍼
const formatPriceForList = (pin) => {
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
  return '-';
}


export default function LeftPanel() {
  const {
    mode,
    visiblePins,
    listTitle, 
    
    tourPins,
    loading,
    isGenerating,
    handleRemoveFromTour,
    handleClearTour,
    handleOptimizeTour,
    clearTempMarkerAndMenu,
    
    selectedPin, 
    
    setSelectedPin,
    fetchLinkedCustomers,
    setImContent,
    mapInstanceRef,
    
    // ★ [수정] roadviewMode, toggleRoadview
    roadviewMode, 
    toggleRoadview,
    
    isListForced,
    
    setAddress, setDetailedAddress, setBuildingName,
    setPropertyType, setPropertyTypeEtc,
    setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium,
    setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus,
    setImageUrls, setImageFiles,
    setValidationErrors,
    
    setIsEditMode,
    
    activeOverlayKey,
    setActiveOverlayKey,

    handleOpenCreateInStack,

    expandedStackKeys, 
    setExpandedStackKeys
  } = useMap();


  // --- ★ (추가) 렌더링할 최종 리스트 (displayList) 생성 ---
  const displayList = useMemo(() => {
    if (isListForced) {
      return visiblePins.map(pin => {
        if (pin.isStackHeader) return { ...pin, isAccordion: false };
        if (!pin.isStack) return { ...pin, isStackChild: true }; 
        return pin;
      });
    }

    const newList = [];
    for (const pin of visiblePins) {
      newList.push({ ...pin, isAccordion: true }); 
      
      if (pin.isStack && pin.pins && expandedStackKeys.has(pin.id)) {
        const childPins = pin.pins.map(p => ({ 
          ...p, 
          isStackChild: true,
          parentStackId: pin.id 
        }));
        newList.push(...childPins);
      }
    }
    return newList;
  }, [visiblePins, expandedStackKeys, isListForced]);
  

  // --- A. '임장 동선' 모드 (★ 수정) ---
  if (mode === 'tour') {
    return (
      <>
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
          {/* ★ [수정] 'PIN' 모드 토글 */}
          <button
            onClick={() => toggleRoadview('PIN')}
            className={`${styles.button} ${roadviewMode === 'PIN' ? styles.buttonBlue : styles.buttonGray}`}
          >
            {roadviewMode === 'PIN' ? '로드뷰 끄기' : '로드뷰 켜기'}
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
      </>
    );
  }

  // --- B. '매물 관리' 모드 (★ 수정) ---
  if (mode === 'manage') {

    const isStackView = visiblePins[0]?.isStackHeader;
    
    let targetCoords = null;
    if (isStackView) {
        targetCoords = { lat: visiblePins[0].lat, lng: visiblePins[0].lng };
    } else if (selectedPin && selectedPin.id) { 
        targetCoords = { lat: selectedPin.lat, lng: selectedPin.lng };
    }
    
    // ✅ [수정] 버튼 표시 조건 (스택 뷰 이거나, 선택된 핀이 있을 때)
    const showActionButtons = isStackView || (selectedPin && selectedPin.id);

    const totalCount = isListForced ? displayList.length : visiblePins.length;

    return (
      <> 
        
        <h3 className={styles.manageTitle}>
          🏠 {listTitle} ({totalCount})
        </h3>
        
        <div className={styles.manageList}>
          {displayList.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? '매물 로딩 중...' : 
               isListForced ? '선택된 매물이 없습니다.' : '지도 범위에 해당하는 매물이 없습니다.'}
            </p>
          )}
          
          {displayList.map((pin) => {
            
            const pinKey = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
            const isActive = activeOverlayKey === pinKey && !pin.isStack;
            const isChildItem = pin.isStackChild === true;
            const isStackHeader = pin.isStackHeader === true;
            const isExpanded = pin.isAccordion && expandedStackKeys.has(pin.id);

            return (
              <div 
                key={pin.id} 
                className={`
                  ${styles.manageItem} 
                  ${isActive ? styles.manageItemActive : ''} 
                  ${isChildItem ? styles.manageItemChild : ''}
                  ${isStackHeader ? styles.manageItemStackHeader : ''}
                  ${isExpanded ? styles.manageItemStackExpanded : ''}
                `}
                
                onClick={() => {
                  if (pin.isAccordion && pin.isStack && pin.pins) {
                    setExpandedStackKeys(prevKeys => {
                        const newKeys = new Set(prevKeys);
                        if (newKeys.has(pin.id)) newKeys.delete(pin.id);
                        else newKeys.add(pin.id);
                        return newKeys;
                    });
                  } 
                  
                  else if (!pin.isStack) { 
                    setActiveOverlayKey(pinKey);
                    setSelectedPin(pin);
                    setIsEditMode(false); 
                    
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
                <div className={styles.manageItemLeft}>
                  <span className={styles.manageItemAddress} title={abbreviateAddress(pin.address)}>
                    {(pin.isStack || pin.isStackHeader) && '📍 '}
                    {abbreviateAddress(pin.address)}
                  </span>
                  <span className={styles.manageItemKeywords} title={pin.keywords}>
                    {pin.keywords || '키워드 없음'}
                  </span>
                </div>
                
                <span className={styles.manageItemPrice}>
                  {!pin.isStack && !pin.isStackHeader ? formatPriceForList(pin) : ''}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* 하단 버튼 영역 */}
        <div className={styles.manageButtonContainer}>
           {showActionButtons ? ( // ✅ [수정] 변수명 변경
             <> {/* ✅ Fragment로 감싸서 여러 버튼을 세로로 배치 */}
               <button
                 className={`${styles.button} ${styles.buttonBlue}`}
                 onClick={() => handleOpenCreateInStack(targetCoords.lat, targetCoords.lng)} 
                 disabled={loading || isGenerating}
               >
                 매물 스택 추가
               </button>
               
               {/* ✅ [수정] 2. 왼쪽 패널 '로드뷰 보기' 버튼 ('PIN' 모드) */}
               <button
                 className={`${styles.button} ${roadviewMode === 'PIN' ? styles.buttonBlue : styles.buttonGray}`}
                 onClick={() => toggleRoadview('PIN')}
                 disabled={loading || isGenerating}
               >
                 {roadviewMode === 'PIN' ? '로드뷰 닫기' : '로드뷰 보기'}
               </button>
             </>
           ) : (
             <p className={styles.manageInfoText}>
                * 새 매물 등록은 지도 우클릭
             </p>
           )}
        </div>
      </>
    );
  }
  
  return null;
}