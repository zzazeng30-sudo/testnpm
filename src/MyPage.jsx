// src/MapPage.jsx (전체 덮어쓰기)
import React, { useRef, useEffect, useState } from 'react';
import { MapProvider } from './contexts/MapContext';
import LeftPanel from './components/map/LeftPanel';
import KakaoMap from './components/map/KakaoMap';
import styles from './MapPage.module.css';
import { useMap } from './contexts/MapContext';

/* 21일차 (리팩토링): '껍데기' 컴포넌트 */
export default function MapPage({ session, mode = 'tour' }) {
  return (
    <MapProvider session={session} mode={mode}>
      <MapPageContent />
    </MapProvider>
  );
}

// --- ★ (추가) 읽기 전용 뷰를 위한 가격 포맷팅 헬퍼 ---
const formatPriceForDisplay = (pin) => {
  const formatNum = (val) => Number(val || 0).toLocaleString();
  const prices = [];
  
  if (pin.is_sale && (pin.sale_price !== null && pin.sale_price !== undefined)) {
    prices.push(`매매 ${formatNum(pin.sale_price)}`);
  }
  if (pin.is_jeonse) {
    let jeonseStr = `전세 ${formatNum(pin.jeonse_deposit)}`;
    if (pin.jeonse_premium !== null && pin.jeonse_premium !== undefined && Number(pin.jeonse_premium) > 0) {
      jeonseStr += ` (권 ${formatNum(pin.jeonse_premium)})`;
    }
    prices.push(jeonseStr);
  }
  if (pin.is_rent) {
    prices.push(`월세 ${formatNum(pin.rent_deposit)} / ${formatNum(pin.rent_amount)}`);
  }
  
  if (prices.length === 0) return "가격 정보 없음";
  // | (파이프)로 구분
  return prices.join(' | '); 
}

/* ★ (수정) useMap에서 필요한 모든 상태/핸들러를 가져옵니다. */
function MapPageContent() {
  const {
    // PinSidebar용 state
    selectedPin, setSelectedPin,
    loading, isGenerating, session, mode,
    customers, linkedCustomers,

    // 폼 state
    address, setAddress, detailedAddress, setDetailedAddress, buildingName, setBuildingName,
    propertyType, setPropertyType, propertyTypeEtc, setPropertyTypeEtc,
    isSale, setIsSale, salePrice, setSalePrice,
    isJeonse, setIsJeonse, jeonseDeposit, setJeonseDeposit, jeonsePremium, setJeonsePremium,
    isRent, setIsRent, rentDeposit, setRentDeposit, rentAmount, setRentAmount,
    keywords, setKeywords, notes, setNotes, status, setStatus,

    // 사진 state
    imageUrls, isUploading, handleImageChange, handleImageRemove, viewingImage, setViewingImage,

    // ✅ [추가] 로드뷰 상태/핸들러
    showRoadview,
    toggleRoadview,

    // 지도/필터 컨트롤 state
    activeMapType, setActiveMapType, filterPropertyType, setFilterPropertyType,
    filterTransactionType, setFilterTransactionType, filterStatus, setFilterStatus,

    // UI/모드/에러 state
    validationErrors, isLeftPanelOpen, setIsLeftPanelOpen, isEditMode, setIsEditMode,
    imContent, setImContent, contextMenu, contextMenuRef,

    // Handlers & Refs
    handleSidebarSave, handleDeletePin, handleGenerateIm, handleAddToTour,
    handleLinkCustomer, handleUnlinkCustomer, clearTempMarkerAndMenu,
    handleContextMenuAction, mapRef
  } = useMap();

  // ★ (수정) isLeftPanelOpen에 따른 LeftPanel 스타일을 동적으로 결정합니다.
  const leftPanelStyle = {
    // LeftPanel 너비 20rem (320px)
    left: isLeftPanelOpen ? '0' : '-20rem',
    transition: 'left 0.3s ease-in-out',
  };

  // ★ (수정) isLeftPanelOpen에 따른 토글 버튼 스타일을 동적으로 결정합니다.
  const toggleButtonStyle = {
      // 20rem (LeftPanel 너비)
      left: isLeftPanelOpen ? '20rem' : '0',
      transition: 'left 0.3s ease-in-out',
  };
  
  // ★ (추가) MapSection의 시작 오프셋 (LeftPanel과 ToggleButton의 너비)을 DOM에서 직접 계산
  const getMapSectionOffsetLeft = () => {
      // MapSection 엘리먼트 (mapRef.current의 부모)가 로드된 후에만 접근
      if (mapRef.current && mapRef.current.parentElement) {
          // MapSection이 .pageContainerMap 내에서 시작하는 위치를 반환
          return mapRef.current.parentElement.offsetLeft;
      }
      return 0;
  };
  
  // (Context Menu 외부 클릭 시 닫기 로직 ... 변경 없음)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        if (contextMenu.visible) {
            handleContextMenuAction('close');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible, handleContextMenuAction]);


  // (컨텍스트 메뉴 위치 계산 ... 변경 없음)
  const contextMenuPositionStyle = (() => {
    if (!mapRef.current || !contextMenu.visible || !mapRef.current.parentElement) return {};
    
    const mapSectionOffsetLeft = getMapSectionOffsetLeft();
    const mapWidth = mapRef.current.parentElement.clientWidth;
    const mapHeight = mapRef.current.parentElement.clientHeight;
    
    const menuHalfWidth = 90;
    const menuHalfHeight = 100;

    if (contextMenu.pinId) {
      return {
        top: `${mapHeight / 2 - menuHalfHeight}px`, 
        left: `${mapSectionOffsetLeft + mapWidth / 2 - menuHalfWidth}px`
      };
    } else {
      return {
        top: `${contextMenu.y}px`,
        left: `${contextMenu.x + mapSectionOffsetLeft}px` 
      };
    }
  })();


  return (
    <div className={styles.pageContainerMap}>

      {/* 1. 왼쪽 패널 (★ 오버레이 스타일 적용) */}
      <div 
        style={leftPanelStyle} 
        className={mode === 'tour' ? styles.tourPanel : styles.managePanel}
      >
        <LeftPanel />
      </div>
      
      {/* ★ (추가) 1.5. 패널 토글 버튼 */}
      <button
        className={`${styles.panelToggleButton}`}
        style={toggleButtonStyle}
        onClick={() => setIsLeftPanelOpen(prev => !prev)}
        title={isLeftPanelOpen ? "패널 접기" : "패널 펼치기"}
      >
        {isLeftPanelOpen ? '◀' : '▶'}
      </button>

      {/* 2. 매물 정보 사이드바 (★ 오버레이 스타일 적용) */}
      <aside
        className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        {/* ... (사이드바 내부 폼, 읽기 전용 뷰 등 ... 변경 없음) ... */}
        {selectedPin && (
          <div className={styles.sidebarContent}>
            
            {/* --- 폼 또는 읽기 전용 뷰 --- */}
            { (isEditMode || !selectedPin.id) ? (
              // --- 1. 수정 모드 또는 새 핀 등록 모드 (기존 폼) ---
              <form key={selectedPin.id || 'new-pin'} onSubmit={handleSidebarSave}>
                <h2 className={styles.sidebarTitle}>
                  {selectedPin.id ? '매물 정보 수정' : '새 매물 등록'}
                </h2>

                {/* --- 1. 소재 정보 --- */}
                <h3 className={styles.formSectionTitle}>소재 정보</h3>

                {/* (매물 유형 2-column) */}
                <div className={styles.formRow}>
                  <div className={`${styles.formGroup} ${propertyType === '기타' ? styles.formGroupHalf : styles.formGroupFull}`}>
                    <label className={styles.label}>
                      매물 유형 
                      <span className={styles.requiredText}>(필수)</span>
                    </label>
                    <select
                      className={styles.input}
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                    >
                      <option value="">-- 유형 선택 --</option>
                      <option value="주택">주택</option>
                      <option value="상가">상가</option>
                      <option value="토지">토지</option>
                      <option value="아파트">아파트</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  {propertyType === '기타' && (
                    <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                      <label className={styles.label}>기타 유형 (상세)</label>
                      <select
                        className={styles.input}
                        value={propertyTypeEtc}
                        onChange={(e) => setPropertyTypeEtc(e.target.value)}
                      >
                        <option value="">-- 기타 유형 선택 --</option>
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i} value={`기타${i + 1}`}>{`기타${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                {/* (주소 관련 폼 ... 변경 없음) */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>주소 (자동 입력)</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="핀을 찍은 곳의 주소"
                    required
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>상세 주소</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={detailedAddress}
                    onChange={(e) => setDetailedAddress(e.target.value)}
                    placeholder="예: 101동 101호"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>건물명</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    placeholder="예: 현대아파트 101동"
                  />
                </div>

                {/* --- 2. 거래 정보 --- */}
                <h3 className={styles.formSectionTitle}>거래 정보</h3>

                {/* (거래 상태 ... 변경 없음) */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>거래 상태</label>
                  <select
                    className={styles.input}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="거래전">거래전</option>
                    <option value="거래중">거래중</option>
                    <option value="거래완료">거래완료</option>
                  </select>
                </div>

                {/* (거래 유형 ... 변경 없음) */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    거래 유형 (중복 가능)
                    <span className={styles.requiredText}>(필수)</span>
                  </label>
                  <div className={styles.checkboxGroup}>
                    {/* (매매, 전세, 월세 체크박스) */}
                     <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isSale}
                        onChange={(e) => setIsSale(e.target.checked)}
                      />
                      매매
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isJeonse}
                        onChange={(e) => setIsJeonse(e.target.checked)}
                      />
                      전세
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={isRent}
                        onChange={(e) => setIsRent(e.target.checked)}
                      />
                      월세
                    </label>
                  </div>
                </div>

                {/* (조건부 가격 입력칸 ... 변경 없음) */}
                {isSale && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>매매 금액 (만원)</label>
                    <input className={styles.input} type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="숫자만 입력 (예: 10000)"/>
                  </div>
                )}
                {isJeonse && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>전세 보증금 (만원)</label>
                      <input className={styles.input} type="number" value={jeonseDeposit} onChange={(e) => setJeonseDeposit(e.target.value)} placeholder="숫자만 입력 (예: 5000)"/>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>권리금 (만원)</label>
                      <input className={styles.input} type="number" value={jeonsePremium} onChange={(e) => setJeonsePremium(e.target.value)} placeholder="숫자만 입력 (없으면 0)"/>
                    </div>
                  </>
                )}
                {isRent && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>월세 보증금 (만원)</label>
                      <input className={styles.input} type="number" value={rentDeposit} onChange={(e) => setRentDeposit(e.target.value)} placeholder="숫자만 입력 (예: 1000)"/>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>월세 (만원)</label>
                      <input className={styles.input} type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="숫자만 입력 (예: 100)"/>
                    </div>
                  </>
                )}

                {/* --- 3. 매물 노트 --- */}
                <h3 className={styles.formSectionTitle}>매물 노트</h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    키워드
                    <span className={styles.requiredText}>(필수)</span>
                  </label>
                  <input className={styles.input} type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="예: #역세권, #신축, #급매"/>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>상세 메모</label>
                  <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="매물에 대한 상세 정보를 입력하세요..."/>
                </div>

                {/* --- 4. 사진 등록 --- */}
                <h3 className={styles.formSectionTitle}>사진 등록 (최대 3개)</h3>
                <div className={styles.imageUploadContainer}>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className={styles.imageSlot}>
                      {imageUrls[index] && imageUrls[index] !== 'remove' ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img
                            src={imageUrls[index].startsWith('blob:') ? imageUrls[index] : imageUrls[index] + `?t=${new Date().getTime()}`}
                            alt={`매물 사진 ${index + 1}`}
                            className={`${styles.imagePreviewThumbnail} ${styles.imagePreviewClickable}`} 
                            onClick={() => setViewingImage(imageUrls[index])} 
                          />
                          <button type="button" className={styles.imageRemoveButton} onClick={() => handleImageRemove(index)} disabled={isUploading}> X </button>
                        </div>
                      ) : (
                        <label className={styles.fileInputLabel}> + <input type="file" className={styles.fileInput} accept="image/*" onChange={(e) => handleImageChange(index, e.target.files[0])} disabled={isUploading}/>
                        </label>
                      )}
                    </div>
                  ))}
                </div>

                {/* --- 4.5. 유효성 검사 에러 --- */}
                {validationErrors.length > 0 && (
                  <div className={styles.validationErrorContainer}>
                    <p className={styles.validationErrorTitle}>다음 필수 항목을 입력하세요:</p>
                    <ul className={styles.validationErrorList}>
                      {validationErrors.map(error => ( <li key={error}>{error}</li> ))}
                    </ul>
                  </div>
                )}

                {/* --- 5. 버튼 그룹 --- */}
                <div className={styles.buttonGroup}>
                  <button onClick={() => {
                    if (selectedPin.id) {
                      setIsEditMode(false); 
                      setValidationErrors([]);
                    } else {
                      setSelectedPin(null);
                      clearTempMarkerAndMenu();
                    }
                  }} type="button" className={`${styles.button} ${styles.buttonGray}`}>
                    {selectedPin.id ? '수정 취소' : '등록 취소'}
                  </button>
                  {selectedPin.id && (
                    <button onClick={() => handleDeletePin(selectedPin.id)} type="button" className={`${styles.button} ${styles.buttonRed}`} disabled={loading || isGenerating || isUploading}>
                      삭제
                    </button>
                  )}
                  <button type="submit" className={`${styles.button} ${styles.buttonBlue}`} disabled={loading || isGenerating || isUploading}>
                    {isUploading ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            
            ) : (
              // --- 2. 읽기 전용 모드 (새로운 '원장 상세' 뷰) ---
              <div className={styles.readOnlyContainer}>
                <h2 className={styles.readOnlyTitle}>원장 상세</h2>
                
                {/* 가격 정보 */}
                <h3 className={styles.readOnlyPrice}>{formatPriceForDisplay(selectedPin)}</h3>
                <p className={styles.readOnlyAddress}>
                  {selectedPin.address || '주소 없음'} {selectedPin.detailed_address || ''}
                </p>

                {/* ★ (수정) 모든 정보를 하나의 테이블로 통합 */}
                <div className={styles.readOnlyTable}>
                  {/* 관리 정보 */}
                  <div className={styles.readOnlyRow}>
                    <span className={styles.readOnlyLabel}>물건유형</span>
                    <span className={styles.readOnlyValue}>
                      {selectedPin.property_type || '-'}
                      {selectedPin.property_type_etc ? ` (${selectedPin.property_type_etc})` : ''}
                    </span>
                  </div>
                  <div className={styles.readOnlyRow}>
                    <span className={styles.readOnlyLabel}>건물명</span>
                    <span className={styles.readOnlyValue}>{selectedPin.buildingName || '-'}</span>
                  </div>
                  <div className={styles.readOnlyRow}>
                    <span className={styles.readOnlyLabel}>거래상태</span>
                    <span className={styles.readOnlyValue}>{selectedPin.status || '-'}</span>
                  </div>

                  {/* 거래 정보 */}
                  {selectedPin.is_sale && (
                    <div className={styles.readOnlyRow}>
                      <span className={styles.readOnlyLabel}>매매</span>
                      <span className={styles.readOnlyValue}>{Number(selectedPin.salePrice || 0).toLocaleString()} 만원</span>
                    </div>
                  )}
                  {selectedPin.is_jeonse && (
                    <>
                      <div className={styles.readOnlyRow}>
                        <span className={styles.readOnlyLabel}>전세</span>
                        <span className={styles.readOnlyValue}>{Number(selectedPin.jeonseDeposit || 0).toLocaleString()} 만원</span>
                      </div>
                      <div className={styles.readOnlyRow}>
                        <span className={styles.readOnlyLabel}>권리금</span>
                        <span className={styles.readOnlyValue}>{Number(selectedPin.jeonsePremium || 0).toLocaleString()} 만원</span>
                      </div>
                    </>
                  )}
                  {selectedPin.is_rent && (
                    <>
                      <div className={styles.readOnlyRow}>
                        <span className={styles.readOnlyLabel}>월세</span>
                        <span className={styles.readOnlyValue}>{Number(selectedPin.rentDeposit || 0).toLocaleString()} / {Number(selectedPin.rentAmount || 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}

                  {/* 매물 노트 */}
                  <div className={styles.readOnlyRow}>
                    <span className={styles.readOnlyLabel}>키워드</span>
                    <span className={styles.readOnlyValue}>{selectedPin.keywords || '-'}</span>
                  </div>
                  <div className={styles.readOnlyRow}>
                    <span className={styles.readOnlyLabel}>상세메모</span>
                    <span className={styles.readOnlyValue} style={{whiteSpace: 'pre-wrap'}}>
                      {selectedPin.notes || '-'}
                    </span>
                  </div>
                </div>

                {/* 사진 정보 */}
                <h3 className={styles.formSectionTitle}>사진</h3>
                <div className={styles.imageUploadContainer}>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className={styles.imageSlot}>
                      {imageUrls[index] && imageUrls[index] !== 'remove' ? (
                        <div className={styles.imagePreviewWrapper}>
                          <img
                            src={imageUrls[index].startsWith('blob:') ? imageUrls[index] : imageUrls[index] + `?t=${new Date().getTime()}`}
                            alt={`매물 사진 ${index + 1}`}
                            className={`${styles.imagePreviewThumbnail} ${styles.imagePreviewClickable}`} 
                            onClick={() => setViewingImage(imageUrls[index])} 
                          />
                        </div>
                      ) : (
                        <div className={styles.imageSlotEmpty}>-</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* --- 추가 기능 버튼 (AI, 임장) --- */}
                <div className={styles.buttonGroupVertical}>
                  <button
                    onClick={() => handleGenerateIm(selectedPin)}
                    type="button"
                    className={`${styles.button} ${styles.buttonPurple}`}
                    disabled={isGenerating || loading}
                  >
                    {isGenerating ? 'AI 입지 분석 중...' : 'AI 입지 분석 (정확도 UP)'}
                  </button>
                  {mode === 'tour' && (
                    <button
                      onClick={() => handleAddToTour(selectedPin)}
                      type="button"
                      className={`${styles.button} ${styles.buttonGreen}`}
                      disabled={isGenerating || loading}
                    >
                      🚩 임장 목록에 추가
                    </button>
                  )}
                </div>

                {/* --- 고객 매칭 --- */}
                {selectedPin.id && (
                  <div className={styles.customerMatcher}>
                    <h3 className={styles.sidebarSubtitle}>고객 매칭</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const customerId = e.target.elements['customer-select'].value;
                        handleLinkCustomer(selectedPin.id, Number(customerId));
                      }}
                    >
                      <label className={styles.label}>고객 선택</label>
                      <select id="customer-select" className={styles.input} defaultValue="">
                        <option value="" disabled>-- 등록된 고객 --</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} ({customer.phone})
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={`${styles.button} ${styles.buttonCyan}`} disabled={loading || isGenerating}>
                        {loading ? '...' : '이 핀에 고객 연결'}
                      </button>
                    </form>
                    <div className={styles.linkedListContainer}>
                      <h4 className={styles.linkedListTitle}>연결된 고객 목록</h4>
                      {linkedCustomers.length === 0 && <p className={styles.emptyText}>연결된 고객이 없습니다.</p>}
                      <ul className={styles.linkedList}>
                        {linkedCustomers.map(link => (
                          <li key={link.id} className={styles.linkedListItem}>
                            <span>{link.customer ? link.customer.name : '삭제된 고객'}</span>
                            <button onClick={() => handleUnlinkCustomer(link.id)} className={styles.unlinkButton} disabled={isGenerating || loading}>
                              연결 해제
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                {/* --- ★ (수정) 하단 버튼 그룹 (non-sticky) --- */}
                <div className={`${styles.buttonGroup} ${styles.readOnlyBottomButtons}`}>
                  <button onClick={() => {
                      setSelectedPin(null);
                      clearTempMarkerAndMenu(); 
                  }} type="button" className={`${styles.button} ${styles.buttonGray}`}>
                    매물 닫기
                  </button>
                  <button onClick={() => setIsEditMode(true)} type="button" className={`${styles.button} ${styles.buttonBlue}`}>
                    매물 수정
                  </button>
                </div>
              </div>
            )}
            
          </div>
        )}
        {/* (사이드바 닫혔을 때 ... 변경 없음) */}
        {!selectedPin && (
          <div className={styles.sidebarEmpty}>
            <p>지도를 우클릭하여 새 핀을 등록하세요.</p>
            {(loading || isGenerating) && <p>데이터 로딩 중...</p>}
          </div>
        )}
      </aside>

      {/* 3. 카카오 지도 (분리된 컴포넌트) */}
      <KakaoMap />

      {/* ★ (추가) 지도 위 필터 컨트롤 (중앙 상단) */}
      <div className={styles.mapFilterContainer}>
         <select 
          className={styles.mapFilterSelect}
          value={filterPropertyType}
          onChange={(e) => setFilterPropertyType(e.target.value)}
        >
          <option value="ALL">전체 유형</option>
          <option value="주택">주택</option>
          <option value="상가">상가</option>
          <option value="토지">토지</option>
          <option value="아파트">아파트</option>
          <option value="기타">기타</option>
        </select>
        <select 
          className={styles.mapFilterSelect}
          value={filterTransactionType}
          onChange={(e) => setFilterTransactionType(e.target.value)}
        >
          <option value="ALL">전체 거래</option>
          <option value="매매">매매</option>
          <option value="전세">전세</option>
          <option value="월세">월세</option>
        </select>
        <select 
          className={styles.mapFilterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">전체 상태</option>
          <option value="거래전">거래전</option>
          <option value="거래중">거래중</option>
          <option value="거래완료">거래완료</option>
        </select>
      </div> 

      {/* (지도 컨트롤 ... ✅ [수정] 로드뷰 버튼 추가) */}
      <div className={styles.mapControlContainer}>
        <button
          className={`${styles.mapControlButton} ${activeMapType === 'NORMAL' ? styles.active : ''}`}
          onClick={() => setActiveMapType('NORMAL')}
        >
          지도
        </button>
        <button
          className={`${styles.mapControlButton} ${activeMapType === 'SKYVIEW' ? styles.active : ''}`}
          onClick={() => setActiveMapType('SKYVIEW')}
        >
          스카이뷰
        </button>
        <button
          className={`${styles.mapControlButton} ${activeMapType === 'CADASTRAL' ? styles.active : ''}`}
          onClick={() => setActiveMapType('CADASTRAL')}
        >
          지적도
        </button>
        
        {/* ✅ [추가] 1. 지도 우측 상단 로드뷰 버튼 */}
        <button
          className={`${styles.mapControlButton} ${showRoadview ? styles.active : ''}`}
          onClick={toggleRoadview}
        >
          로드뷰
        </button>
      </div>

      {/* 4. 입지 분석 모달 (★ 임시: 원래는 ImModal.jsx) */}
      {imContent && (
        <div className={styles.imModalOverlay}>
          <div className={styles.imModal}>
            <h2 className={styles.imModalTitle}>AI 생성 입지 분석 (실데이터 기반)</h2>
            <div className={styles.imContentScroll}>
              <pre className={styles.imContentPre}>{imContent}</pre>
            </div>
            <button
              onClick={() => setImContent(null)}
              className={`${styles.button} ${styles.buttonRed}`}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 5. 'div' 기반 컨텍스트 메뉴 (★ 수정된 부분) */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={contextMenu.pinId ? (
            {
              top: `calc(50% - 100px)`, 
              left: `calc(50% + ${getMapSectionOffsetLeft()}px + 30px)` 
            }
          ) : (
            {
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x + getMapSectionOffsetLeft()}px` 
            }
          )}
        >
          {/* ★ 핀에 대한 오른쪽 클릭 메뉴 ★ */}
          {contextMenu.pinId ? (
            <>
              <button onClick={() => handleContextMenuAction('editPin')}>
                매물 수정 (사이드바)
              </button>
              <button 
                onClick={() => handleContextMenuAction('deletePin')} 
                disabled={loading || isGenerating || contextMenu.isStack} 
              >
                매물 삭제
              </button>
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} />
              <button onClick={() => handleContextMenuAction('addPinToStack')} disabled={loading || isGenerating}>
                매물 스택 추가
              </button>
              {contextMenu.isStack && (
                <button 
                    onClick={() => handleContextMenuAction('editPin')}
                    disabled={loading || isGenerating}
                    style={{ marginTop: '0.5rem' }}
                >
                  📍 스택 (묶음) 매물 {contextMenu.pins ? contextMenu.pins.length : 0}개 보기
                </button>
              )}
            </>
          ) : (
            /* ★ 지도 빈 공간에 대한 오른쪽 클릭 메뉴 (기존 로직) ★ */
            <>
              <button onClick={() => handleContextMenuAction('createPin')}>
                임장 등록 (핀 생성)
              </button>
              <button disabled>예시 2 (준비중)</button>
              <button disabled>예시 3 (준비중)</button>
              <button disabled>예시 4 (준비중)</button>
            </>
          )}
        </div>
      )}

      {/* 6. 사진 뷰어 모달 (★ 변경 없음) */}
      {viewingImage && (
        <div
          className={styles.imModalOverlay} 
          onClick={() => setViewingImage(null)}
        >
          <div
            className={styles.imageViewerModal} 
            onClick={(e) => e.stopPropagation()} 
          >
            <img
              src={viewingImage.startsWith('blob:') ? viewingImage : viewingImage + `?t=${new Date().getTime()}`}
              alt="매물 사진 크게 보기"
            />
            <button
              onClick={() => setViewingImage(null)}
              className={styles.imageViewerCloseButton} 
            >
              X
            </button>
          </div>
        </div>
      )}

    </div>
  );
}