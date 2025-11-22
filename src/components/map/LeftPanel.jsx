import React, { useMemo } from 'react'; 
import { useMap } from '../../contexts/MapContext'; 
import styles from "../../features/map/pages/MapPage.module.css";

const abbreviateAddress = (address) => {
  if (!address) return '주소 없음';
  return address
    .replace("충청남도", "충남").replace("충청북도", "충북")
    .replace("경상남도", "경남").replace("경상북도", "경북")
    .replace("전라남도", "전남").replace("전라북도", "전북")
    .replace("경기도", "경기").replace("강원도", "강원")
    .replace("제주특별자치도", "제주");
};

const formatPriceForList = (pin) => {
  const formatNum = (val) => Number(val || 0).toLocaleString();
  if (pin.is_sale && (pin.sale_price !== null)) return `매) ${formatNum(pin.sale_price)} 만`;
  if (pin.is_jeonse && (pin.jeonse_deposit !== null)) return `전) ${formatNum(pin.jeonse_deposit)} 만`;
  if (pin.is_rent) return `월) ${formatNum(pin.rent_deposit)} / ${formatNum(pin.rent_amount)}`;
  return '-';
}

export default function LeftPanel() {
  const {
    visiblePins, listTitle, loading, 
    selectedPin, setSelectedPin, isListForced, activeOverlayKey, setActiveOverlayKey,
    handleOpenCreateInStack, expandedStackKeys, setExpandedStackKeys,
    fetchLinkedCustomers, setAddress, setDetailedAddress, setBuildingName,
    setPropertyType, setPropertyTypeEtc, setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium, setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus, setImageUrls, setImageFiles,
    setValidationErrors, setIsEditMode, setImContent, mapInstanceRef,
    roadviewMode, toggleRoadview, isGenerating
  } = useMap();

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
        const childPins = pin.pins.map(p => ({ ...p, isStackChild: true, parentStackId: pin.id }));
        newList.push(...childPins);
      }
    }
    return newList;
  }, [visiblePins, expandedStackKeys, isListForced]);

  return (
    <div className={styles.panelContentWrapper}>
       <h3 className={styles.manageTitle}>
         🏠 {listTitle} <span style={{fontSize: '0.9rem', color: '#666'}}>({isListForced ? displayList.length : visiblePins.length})</span>
       </h3>
       
       <div className={styles.manageList}>
          {displayList.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? '로딩 중...' : '지도 범위 내 매물이 없습니다.'}
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
                      } else if (!pin.isStack) { 
                        setActiveOverlayKey(pinKey);
                        setSelectedPin(pin);
                        setIsEditMode(false); 
                        setAddress(pin.address || ''); setDetailedAddress(pin.detailed_address || ''); setBuildingName(pin.building_name || '');
                        setPropertyType(pin.property_type || ''); setPropertyTypeEtc(pin.property_type_etc || ''); 
                        setIsSale(pin.is_sale || false); setSalePrice(pin.sale_price !== null ? String(pin.sale_price) : ''); 
                        setIsJeonse(pin.is_jeonse || false); setJeonseDeposit(pin.jeonse_deposit !== null ? String(pin.jeonse_deposit) : ''); setJeonsePremium(pin.jeonse_premium !== null ? String(pin.jeonse_premium) : ''); 
                        setIsRent(pin.is_rent || false); setRentDeposit(pin.rent_deposit !== null ? String(pin.rent_deposit) : ''); setRentAmount(pin.rent_amount !== null ? String(pin.rent_amount) : ''); 
                        setKeywords(pin.keywords || ''); setNotes(pin.notes || ''); setStatus(pin.status || '거래전');
                        setImageUrls(pin.image_urls || ['', '', '']); setImageFiles([null, null, null]);
                        setValidationErrors([]); fetchLinkedCustomers(pin.id); setImContent(null);
                        if (mapInstanceRef.current && window.kakao) {
                            mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
                        }
                      }
                  }}
                >
                   <div className={styles.manageItemLeft}>
                      <span className={styles.manageItemAddress}>
                        {(pin.isStack || pin.isStackHeader) && '📍 '}
                        {abbreviateAddress(pin.address)}
                      </span>
                      <span className={styles.manageItemKeywords}>{pin.keywords}</span>
                   </div>
                   <span className={styles.manageItemPrice}>
                      {!pin.isStack && !pin.isStackHeader ? formatPriceForList(pin) : ''}
                   </span>
                </div>
             );
          })}
       </div>

       <div className={styles.manageButtonContainer}>
          {(displayList[0]?.isStackHeader || (selectedPin && selectedPin.id)) ? (
             <>
               <button className={`${styles.button} ${styles.buttonBlue}`} onClick={() => handleOpenCreateInStack(displayList[0]?.isStackHeader ? visiblePins[0].lat : selectedPin.lat, displayList[0]?.isStackHeader ? visiblePins[0].lng : selectedPin.lng)} disabled={loading || isGenerating}>
                 매물 스택 추가
               </button>
               <button className={`${styles.button} ${roadviewMode === 'PIN' ? styles.buttonBlue : styles.buttonGray}`} onClick={() => toggleRoadview('PIN')} disabled={loading || isGenerating}>
                 {roadviewMode === 'PIN' ? '로드뷰 닫기' : '로드뷰 보기'}
               </button>
             </>
           ) : (
             <p className={styles.manageInfoText}>* 새 매물 등록은 지도 우클릭</p>
           )}
       </div>
    </div>
  );
}