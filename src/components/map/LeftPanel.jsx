import React, { useMemo } from 'react'; 
import { useMap } from '../../contexts/MapContext'; 
import styles from '../../features/map/styles/MapSidebar.module.css';

// 주소 줄임 함수 (1번 영역용)
const abbreviateAddress = (address) => {
  if (!address) return '주소 없음';
  return address
    .replace("충청남도", "충남").replace("충청북도", "충북")
    .replace("경상남도", "경남").replace("경상북도", "경북")
    .replace("전라남도", "전남").replace("전라북도", "전북")
    .replace("경기도", "경기").replace("강원도", "강원")
    .replace("제주특별자치도", "제주");
};

// 가격 포맷 함수
const getPriceString = (pin) => {
    const formatNum = (val) => Number(val || 0).toLocaleString();
    if (pin.is_sale && pin.sale_price) return `매매 ${formatNum(pin.sale_price)}`;
    if (pin.is_jeonse) return `전세 ${formatNum(pin.jeonse_deposit)}`;
    if (pin.is_rent) return `월세 ${formatNum(pin.rent_deposit)}/${formatNum(pin.rent_amount)}`;
    return '가격미정';
};

export default function LeftPanel() {
  const {
    visiblePins, loading, 
    selectedPin, isListForced, activeOverlayKey, setActiveOverlayKey,
    handleOpenCreateInStack, expandedStackKeys, setExpandedStackKeys,
    fetchLinkedCustomers, setAddress, setDetailedAddress, setBuildingName,
    setPropertyType, setPropertyTypeEtc, setIsSale, setSalePrice,
    setIsJeonse, setJeonseDeposit, setJeonsePremium, setIsRent, setRentDeposit, setRentAmount,
    setKeywords, setNotes, setStatus, setImageUrls, setImageFiles,
    setValidationErrors, setIsEditMode, setImContent, mapInstanceRef,
    setSelectedPin, roadviewMode, toggleRoadview, isGenerating
  } = useMap();

  // 1. 화면에 표시할 리스트 가공
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

  // 2. (1번 영역) 상단 통계 제목 계산
  const getHeaderStats = () => {
      if (!visiblePins || visiblePins.length === 0) return { title: "지도 내 매물", stats: "" };
      
      const isStackView = visiblePins[0]?.isStackHeader;
      const targetPins = isStackView ? visiblePins.slice(1) : visiblePins; 

      const mainAddress = abbreviateAddress(visiblePins[0]?.address || "");

      const total = targetPins.length;
      const inProgress = targetPins.filter(p => p.status === '거래중').length;
      const completed = targetPins.filter(p => p.status === '거래완료').length;

      return {
          address: mainAddress,
          stats: `( 전체 ${total} / 거래중 ${inProgress} / 거래완료 ${completed} )`
      };
  };

  const headerInfo = getHeaderStats();

  // 3. 핀 클릭 핸들러
  const handleItemClick = (pin) => {
    if (pin.isAccordion && pin.isStack && pin.pins) {
        setExpandedStackKeys(prevKeys => {
            const newKeys = new Set(prevKeys);
            if (newKeys.has(pin.id)) newKeys.delete(pin.id);
            else newKeys.add(pin.id);
            return newKeys;
        });
    } else if (!pin.isStack) { 
        const pinKey = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
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
  };

  return (
    <div className={styles.panelContentWrapper}>
       {/* [1번 영역] 패널 제목 + 통계 (유지) */}
       <div className={styles.manageTitleContainer}>
           <h3 className={styles.manageTitleAddress}>
               {isListForced ? headerInfo.address : "지도 내 매물"}
           </h3>
           {isListForced && (
               <div className={styles.manageTitleStats}>{headerInfo.stats}</div>
           )}
       </div>
       
       <div className={styles.manageList}>
          {displayList.length === 0 && (
            <p className={styles.emptyText}>
              {loading ? '로딩 중...' : '매물이 없습니다.'}
            </p>
          )}
          
          {displayList.map((pin, index) => {
             const pinKey = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
             const isActive = activeOverlayKey === pinKey && !pin.isStack;
             const isChildItem = pin.isStackChild === true;
             const isStackHeader = pin.isStackHeader === true;
             const isExpanded = pin.isAccordion && expandedStackKeys.has(pin.id);

             // [2번 영역] 스택 헤더: 건물명만 표시
             if (isStackHeader) {
                 const saleCnt = pin.pins.filter(p => p.is_sale).length;
                 const jeonseCnt = pin.pins.filter(p => p.is_jeonse).length;
                 const rentCnt = pin.pins.filter(p => p.is_rent).length;

                 return (
                    <div key={pin.id} className={`${styles.manageItem} ${styles.manageItemStackHeader}`}>
                        <div className={styles.stackHeaderContent}>
                            <div className={styles.stackHeaderBuilding}>
                                {/* ★ 수정: 주소 빼고 건물명만 */}
                                {pin.building_name || '건물명 미입력'}
                            </div>
                            <div className={styles.stackHeaderCounts}>
                                (매매 {saleCnt} / 전세 {jeonseCnt} / 월세 {rentCnt})
                            </div>
                        </div>
                    </div>
                 );
             }

             // [3번 영역] 개별 매물 아이템
             // (displayList에는 헤더가 포함될 수 있으므로, 실제 순번 계산이 필요할 수 있으나 여기선 index 활용)
             // 스택 내부라면 index가 헤더 다음부터 시작하므로 1,2,3.. 보정을 위해 헤더가 있으면 index 조정 필요
             // 다만 간단히 구현하기 위해 현재 index 사용 (헤더가 0번이면 1번부터 나옴)
             
             const thumbnail = (pin.image_urls && pin.image_urls[0]) ? pin.image_urls[0] : null;
             
             return (
                <div 
                  key={pin.id} 
                  className={`
                    ${styles.manageItem} 
                    ${isActive ? styles.manageItemActive : ''} 
                    ${isChildItem ? styles.manageItemChild : ''}
                    ${isExpanded ? styles.manageItemStackExpanded : ''}
                  `}
                  onClick={() => handleItemClick(pin)}
                >
                   {/* 왼쪽 정보 영역 */}
                   <div className={styles.childItemInfo}>
                      
                      {/* 첫째 줄: [순번]. [상세주소] [상태] */}
                      <div className={styles.childItemRow1}>
                          <span className={styles.childItemIndex}>{index}.</span>
                          <span className={styles.childItemDetailAddr}>
                              {pin.detailed_address || '호수 미입력'}
                          </span>
                          <span className={`${styles.childItemStatus} ${pin.status === '거래완료' ? styles.statusDone : pin.status === '거래중' ? styles.statusIng : ''}`}>
                              {pin.status}
                          </span>
                      </div>

                      {/* 둘째 줄: [가격] [키워드] */}
                      <div className={styles.childItemRow2}>
                          <span className={styles.childItemPrice}>{getPriceString(pin)}</span>
                          <span className={styles.childItemKeywords}>
                              {pin.keywords || ''}
                          </span>
                      </div>
                   </div>

                   {/* 오른쪽 사진 */}
                   {thumbnail && (
                       <div className={styles.childItemImageWrapper}>
                           <img src={thumbnail} alt="매물" className={styles.childItemImage} />
                       </div>
                   )}
                </div>
             );
          })}
       </div>

       <div className={styles.manageButtonContainer}>
          {/* 버튼 영역 (유지) */}
          {(displayList[0]?.isStackHeader || (selectedPin && selectedPin.id)) ? (
             <>
               <button className={`${styles.button} ${styles.buttonBlue}`} onClick={() => handleOpenCreateInStack(displayList[0]?.isStackHeader ? visiblePins[0].lat : selectedPin.lat, displayList[0]?.isStackHeader ? visiblePins[0].lng : selectedPin.lng)} disabled={loading || isGenerating}>
                 이 위치에 매물 추가
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