// src/PropertyPage.jsx (수정)
import React, { useState, useEffect } from 'react'
// ✅ (이렇게 수정하세요: 점 2개 + lib)
import { supabase } from "../../lib/supabaseClient";
import styles from './PropertyPage.module.css';

export default function PropertyPage({ session }) {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  // --- 폼 상태 (변경 없음) ---
  const [newAddress, setNewAddress] = useState('')
  const [newDetailedAddress, setNewDetailedAddress] = useState('');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState('');
  const [newPropertyTypeEtc, setNewPropertyTypeEtc] = useState('');
  const [newIsSale, setNewIsSale] = useState(false);
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newIsJeonse, setNewIsJeonse] = useState(false);
  const [newJeonseDeposit, setNewJeonseDeposit] = useState('');
  const [newJeonsePremium, setNewJeonsePremium] = useState('');
  const [newIsRent, setNewIsRent] = useState(false);
  const [newRentDeposit, setNewRentDeposit] = useState('');
  const [newRentAmount, setNewRentAmount] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCoords, setNewCoords] = useState(null)
  
  // --- ★ (수정/추가) 검색 및 필터 상태 ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 매물 유형 (드롭다운)
  
  // ★ 거래 모드 (ALL, SALE, JEONSE, RENT 중 하나만 선택)
  const [filterTransactionMode, setFilterTransactionMode] = useState('ALL'); 

  // ★ 가격 필터 토글 상태
  const [isPriceFilterVisible, setIsPriceFilterVisible] = useState(false);

  // ★ (NEW) 권리금 필터 그룹
  const [premiumMin, setPremiumMin] = useState(''); 
  const [premiumMax, setPremiumMax] = useState(''); 

  // ★ 일시금/보증금 필터 그룹 (매매가, 전세보증금, 권리금, 월세보증금)
  const [lumpSumMin, setLumpSumMin] = useState('');
  const [lumpSumMax, setLumpSumMax] = useState('');
  // ★ (REMOVED) 일시금 대상 체크박스
  // const [lumpSumTargets, setLumpSumTargets] = useState(new Set(['SALE_PRICE', 'JEONSE_DEPOSIT', 'RENT_DEPOSIT', 'PREMIUM']));

  // ★ 월세 필터 그룹 (월세 금액)
  const [rentMin, setRentMin] = useState('');
  const [rentMax, setRentMax] = useState('');

  // (주소 변환 헬퍼)
  const getAddressFromCoords = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        resolve('Geocoder 없음');
        return;
      }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const road = result[0].road_address ? result[0].road_address.address_name : null;
          const jibun = result[0].address ? result[0].address.address_name : null;
          resolve(road || jibun || '주소 정보 없음');
        } else {
          resolve('주소 변환 실패');
        }
      });
    });
  };

  // 1. (Read) 매물 목록 (pins) 읽어오기
  const fetchProperties = async () => {
    setLoading(true);
    const { data: pinsData, error: dbError } = await supabase
      .from('pins')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('매물 목록 로드 오류:', dbError.message);
      setProperties([]);
      setLoading(false);
      return;
    }
    setProperties(pinsData || []);
    setLoading(false);
  }

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        fetchProperties();
      });
    } else {
        // 카카오맵이 로드되지 않았을 경우 (SPA 환경)
        fetchProperties();
    }
  }, [])

  // 2. (Create) '새 매물 등록' 폼 제출 핸들러 (★ 0값 버그 수정)
  const handleCreateProperty = async (event) => {
    event.preventDefault()
    if (!newAddress || !newCoords) {
      alert('주소와 좌표는 필수입니다. (주소로 좌표 변환을 먼저 실행하세요)')
      return
    }
    setLoading(true)

    const parseNum = (val) => {
        if (val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    };

    const newPropertyData = {
      address: newAddress,
      detailed_address: newDetailedAddress,
      building_name: newBuildingName,
      property_type: newPropertyType,
      property_type_etc: newPropertyType === '기타' ? newPropertyTypeEtc : '',
      is_sale: newIsSale,
      sale_price: parseNum(newSalePrice),
      is_jeonse: newIsJeonse,
      jeonse_deposit: parseNum(newJeonseDeposit),
      jeonse_premium: parseNum(newJeonsePremium),
      is_rent: newIsRent,
      rent_deposit: parseNum(newRentDeposit),
      rent_amount: parseNum(newRentAmount),
      keywords: newKeywords,
      notes: newNotes,
      status: '거래전',
      image_urls: ['', '', ''],
      lat: newCoords.lat,
      lng: newCoords.lng,
      user_id: session.user.id,
    }

    const { data, error } = await supabase.from('pins').insert(newPropertyData).select();
    if (error) {
      console.error('매물 생성 오류:', error.message)
      alert('매물 생성 오류: ' + error.message);
    } else {
      fetchProperties();
      // 폼 초기화
      setNewAddress('')
      setNewDetailedAddress('')
      setNewBuildingName('')
      setNewPropertyType('');
      setNewPropertyTypeEtc('');
      setNewIsSale(false);
      setNewSalePrice('');
      setNewIsJeonse(false);
      setNewJeonseDeposit('');
      setNewJeonsePremium('');
      setNewIsRent(false);
      setNewRentDeposit('');
      setNewRentAmount('');
      setNewKeywords('');
      setNewNotes('');
      setNewCoords(null)
    }
  }

  // 3. (Delete) '매물 삭제' 버튼 클릭 핸들러
  const handleDeleteProperty = async (pinId) => {
    setLoading(true)
    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', pinId)

    if (error) {
      console.error('매물 삭제 오류:', error.message)
    } else {
      setProperties(currentProperties => currentProperties.filter(p => p.id !== pinId))
    }
    setLoading(false)
  }

  // 4. '주소로 좌표 변환' 버튼 핸들러
  const handleGeocode = () => {
    if (!newAddress) {
      alert('주소를 입력하세요.');
      return;
    }
    if (!window.kakao || !window.kakao.maps.services) {
      alert('카카오맵 "services" 라이브러리가 로드되지 않았습니다.');
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(newAddress, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = { lat: result[0].y, lng: result[0].x };
        setNewCoords(coords);
        alert(`좌표 변환 성공: [${coords.lat}, ${coords.lng}]`);
      } else {
        alert('주소로 좌표를 찾지 못했습니다.');
        setNewCoords(null);
      }
    });
  }

  // 날짜 포맷팅 유틸리티
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  // ★ 가격 포맷팅 유틸리티 (가격 컬럼용)
  // [NEW] 세구분(col3)과 가격(col4)에 들어갈 데이터를 반환하도록 수정
  const formatPrice = (pin) => {
    const data = {
        transactionType: [],
        priceDetail: []
    };
    
    const formatNum = (val) => Number(val || 0).toLocaleString();
    
    // 1. 매매
    if (pin.is_sale && (pin.sale_price !== null && pin.sale_price !== undefined)) {
        data.transactionType.push('매매');
        data.priceDetail.push(
            `<span class="${styles.labelEmphasis}">매매가</span> [ <span class="${styles.priceValueSale}">${formatNum(pin.sale_price)} 만원</span> ]`
        );
    }
    
    // 2. 전세
    if (pin.is_jeonse) {
        data.transactionType.push('전세');
        const deposit = (pin.jeonse_deposit !== null && pin.jeonse_deposit !== undefined) ? formatNum(pin.jeonse_deposit) : '-';
        const premium = (pin.jeonse_premium !== null && pin.jeonse_premium !== undefined && pin.jeonse_premium > 0) 
            ? `<span class="${styles.labelEmphasis}"> / 권리금</span> [ <span class="${styles.priceValuePremium}">${formatNum(pin.jeonse_premium)} 만원</span> ]`
            : '';
        
        // ★ 전세 레이블을 '보증금'이 아닌 '전세금'으로 표시
        data.priceDetail.push(
            `<span class="${styles.labelEmphasis}">전세금</span> [ <span class="${styles.priceValueJeonse}">${deposit} 만원</span> ] ${premium}`
        );
    }
    
    // 3. 월세
    if (pin.is_rent) {
        data.transactionType.push('월세');
        const deposit = (pin.rent_deposit !== null && pin.rent_deposit !== undefined) ? formatNum(pin.rent_deposit) : '0';
        const rent = (pin.rent_amount !== null && pin.rent_amount !== undefined) ? formatNum(pin.rent_amount) : '0';
        data.priceDetail.push(
            `<span class="${styles.labelEmphasis}">보증금</span> [ <span class="${styles.priceValueRentDeposit}">${deposit} 만원</span> ] <span class="${styles.labelEmphasis}"> / 월세</span> [ <span class="${styles.priceValueRentAmount}">${rent} 만원</span> ]`
        );
    }

    return {
        transactionType: data.transactionType.join('\n'), // 줄바꿈으로 구분
        priceDetail: data.priceDetail.join('\n')
    };
  }

  // ★ 상태 텍스트 포맷팅 유틸리티
  const formatStatus = (pin) => {
      return pin.status || '거래전';
  }
  
  // ★ 거래 모드 선택 핸들러 (필수 선택 로직 포함)
  const handleTransactionModeChange = (mode) => {
    if (filterTransactionMode === mode && mode !== 'ALL') {
      // 이미 선택된 모드(전체 제외)를 다시 누르면, '전체'로 돌아가야 하지만
      // 요구사항: 무조건 1개는 선택되어야 함. 따라서 다시 누르면 선택 취소가 안되게 막음
      alert('거래 유형은 최소 1개(전체 포함)를 선택해야 합니다.');
      return;
    }
    setFilterTransactionMode(mode);
  }

  // --- ★ (수정) 매물 필터링 및 검색 로직 ---
  const filteredAndSearchedProperties = properties.filter(pin => {
    // 1. 검색어 필터링 (주소/건물명 또는 메모/키워드)
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = pin.address?.toLowerCase().includes(searchLower) ||
                          pin.building_name?.toLowerCase().includes(searchLower) ||
                          pin.notes?.toLowerCase().includes(searchLower) ||
                          pin.keywords?.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    // 2. 매물 유형 필터링
    if (filterType !== 'ALL' && pin.property_type !== filterType) {
      return false;
    }

    // 3. 거래 유형 필터링 (단일 모드)
    if (filterTransactionMode !== 'ALL') {
      if (filterTransactionMode === 'SALE' && !pin.is_sale) return false;
      if (filterTransactionMode === 'JEONSE' && !pin.is_jeonse) return false;
      if (filterTransactionMode === 'RENT' && !pin.is_rent) return false;
    }
    
    // 4. 가격대별 필터링 (권리금) ★ NEW
    const isPremiumMinValid = !isNaN(Number(premiumMin)) && Number(premiumMin) >= 0 && premiumMin !== '';
    const isPremiumMaxValid = !isNaN(Number(premiumMax)) && Number(premiumMax) >= 0 && premiumMax !== '';

    if (isPremiumMinValid || isPremiumMaxValid) {
        const premiumAmount = (pin.is_jeonse && pin.jeonse_premium !== null) ? Number(pin.jeonse_premium) : -1;

        if (premiumAmount === -1) return false; // 전세 매물 자체가 아니거나 권리금이 없으면 제외

        const meetsMin = !isPremiumMinValid || premiumAmount >= Number(premiumMin);
        const meetsMax = !isPremiumMaxValid || premiumAmount <= Number(premiumMax);

        if (!meetsMin || !meetsMax) return false;
    }

    // 5. 가격대별 필터링 (매매/전세/보증금) ★ MODIFIED: 체크박스 제거에 따라 로직 변경
    const isLumpSumMinValid = !isNaN(Number(lumpSumMin)) && Number(lumpSumMin) >= 0 && lumpSumMin !== '';
    const isLumpSumMaxValid = !isNaN(Number(lumpSumMax)) && Number(lumpSumMax) >= 0 && lumpSumMax !== '';

    if (isLumpSumMinValid || isLumpSumMaxValid) {
        const targets = [];
        // 매매가
        if (pin.is_sale && pin.sale_price !== null) targets.push(Number(pin.sale_price));
        // 전세보증금
        if (pin.is_jeonse && pin.jeonse_deposit !== null) targets.push(Number(pin.jeonse_deposit));
        // 월세보증금
        if (pin.is_rent && pin.rent_deposit !== null) targets.push(Number(pin.rent_deposit));
        
        // 검색 범위가 있으나, 매물에 대상 가격이 없는 경우 제외
        if (targets.length === 0) return false;

        let matches = false;
        for (const price of targets) {
            const meetsMin = !isLumpSumMinValid || price >= Number(lumpSumMin);
            const meetsMax = !isLumpSumMaxValid || price <= Number(lumpSumMax);
            if (meetsMin && meetsMax) {
                matches = true;
                break;
            }
        }
        if (!matches) return false;
    }

    // 6. 가격대별 필터링 (월세 금액)
    const isRentMinValid = !isNaN(Number(rentMin)) && Number(rentMin) >= 0 && rentMin !== '';
    const isRentMaxValid = !isNaN(Number(rentMax)) && Number(rentMax) >= 0 && rentMax !== '';

    if (isRentMinValid || isRentMaxValid) {
        const rentAmount = (pin.is_rent && pin.rent_amount !== null) ? Number(pin.rent_amount) : -1;

        if (rentAmount === -1) return false; // 월세 매물 자체가 아니면 제외

        const meetsMin = !isRentMinValid || rentAmount >= Number(rentMin);
        const meetsMax = !isRentMaxValid || rentAmount <= Number(rentMax);

        if (!meetsMin || !meetsMax) return false;
    }

    return true;
  });
  // --- (필터링 및 검색 로직 종료) ---


  // 화면 렌더링
  return (
    <div className={styles.pageContainer}>

      {/* 1. '새 매물 등록' 폼 (왼쪽) */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>
          새 매물 등록
        </h2>
        <form className={styles.form} onSubmit={handleCreateProperty}>
          {/* --- 매물 유형 (2-column layout) --- */}
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${newPropertyType === '기타' ? styles.formGroupHalf : styles.formGroupFull}`}>
              <label className={styles.label}>매물 유형</label>
              <select
                className={styles.input}
                value={newPropertyType}
                onChange={(e) => setNewPropertyType(e.target.value)}
              >
                <option value="">-- 유형 선택 --</option>
                <option value="주택">주택</option>
                <option value="상가">상가</option>
                <option value="토지">토지</option>
                <option value="아파트">아파트</option>
                <option value="기타">기타</option>
              </select>
            </div>
            {newPropertyType === '기타' && (
              <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                <label className={styles.label}>기타 유형 (상세)</label>
                <select
                  className={styles.input}
                  value={newPropertyTypeEtc}
                  onChange={(e) => setNewPropertyTypeEtc(e.target.value)}
                >
                  <option value="">-- 기타 유형 선택 --</option>
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i} value={`기타${i + 1}`}>{`기타${i + 1}`}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {/* --- 주소 관련 --- */}
          <div>
            <label className={styles.label}>주소 (좌표 변환용)</label>
            <div className={styles.addressGroup}>
              <input
                className={styles.input}
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="예: 서울시 강남구 테헤란로 123"
              />
              <button
                type="button"
                onClick={handleGeocode}
                className={styles.geocodeButton}
                disabled={loading}
              >
                좌표 변환
              </button>
            </div>
            {newCoords && (
              <p className={styles.coordsText}>
                lat: {newCoords.lat}, lng: {newCoords.lng}
              </p>
            )}
          </div>
          <div>
            <label className={styles.label}>상세 주소</label>
            <input
              className={styles.input}
              type="text"
              value={newDetailedAddress}
              onChange={(e) => setNewDetailedAddress(e.target.value)}
              placeholder="예: 101동 101호"
            />
          </div>
          <div>
            <label className={styles.label}>건물명</label>
            <input
              className={styles.input}
              type="text"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              placeholder="예: 현대아파트"
            />
          </div>
          {/* --- 거래 유형 --- */}
          <div>
            <label className={styles.label}>거래 유형</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={newIsSale} onChange={(e) => setNewIsSale(e.target.checked)} /> 매매
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={newIsJeonse} onChange={(e) => setNewIsJeonse(e.target.checked)} /> 전세
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={newIsRent} onChange={(e) => setNewIsRent(e.target.checked)} /> 월세
              </label>
            </div>
          </div>
          {/* --- 조건부 가격 폼 --- */}
          {newIsSale && (
            <div>
              <label className={styles.label}>매매 금액 (만원)</label>
              <input className={styles.input} type="number" value={newSalePrice} onChange={(e) => setNewSalePrice(e.target.value)} />
            </div>
          )}
          {newIsJeonse && (
            <>
              <div>
                <label className={styles.label}>전세 보증금 (만원)</label>
                <input className={styles.input} type="number" value={newJeonseDeposit} onChange={(e) => setNewJeonseDeposit(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>권리금 (만원)</label>
                <input className={styles.input} type="number" value={newJeonsePremium} onChange={(e) => setNewJeonsePremium(e.target.value)} />
              </div>
            </>
          )}
          {newIsRent && (
            <>
              <div>
                <label className={styles.label}>월세 보증금 (만원)</label>
                <input className={styles.input} type="number" value={newRentDeposit} onChange={(e) => setNewRentDeposit(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>월세 (만원)</label>
                <input className={styles.input} type="number" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} />
              </div>
            </>
          )}
          {/* --- 키워드 및 메모 --- */}
          <div>
            <label className={styles.label}>키워드</label>
            <input
              className={styles.input}
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="예: #역세권, #신축"
            />
          </div>
          <div>
            <label className={styles.label}>상세 메모</label>
            <textarea
              className={styles.textarea}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="매물 상세 정보..."
              required
            />
          </div>

          <button
            type="submit"
            className={styles.button}
            disabled={loading || !newCoords}
          >
            {loading ? '등록 중...' : '매물 등록 (핀 생성)'}
          </button>
        </form>
      </aside>

      {/* 2. '매물 리스트' (오른쪽) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          매물 리스트 (총 {filteredAndSearchedProperties.length}건 / 전체 {properties.length}건)
        </h2>

        {/* --- ★ (수정) 검색 및 필터 영역 --- */}
        <div className={styles.filterBarContainer}>
            {/* 1. 검색창 */}
            <input
                className={styles.filterSearchInput}
                type="text"
                placeholder="주소, 건물명, 키워드, 메모 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            {/* 2. 메인 필터 그룹 (유형 + 거래유형 모드) */}
            <div className={styles.mainFilterGroup}>
                {/* 1. 유형 드롭다운 */}
                <select 
                    className={styles.filterSelect}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="ALL">전체 유형</option>
                    <option value="주택">주택</option>
                    <option value="상가">상가</option>
                    <option value="토지">토지</option>
                    <option value="아파트">아파트</option>
                    <option value="기타">기타</option>
                </select>

                {/* 2. 거래 유형 모드 선택 버튼 (애플 UI 스타일) */}
                <div className={styles.transactionModeGroup}>
                    {['ALL', 'SALE', 'JEONSE', 'RENT'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`${styles.transactionModeButton} ${filterTransactionMode === mode ? styles.active : ''}`}
                        onClick={() => handleTransactionModeChange(mode)}
                      >
                        {mode === 'ALL' ? '전체' : mode === 'SALE' ? '매매' : mode === 'JEONSE' ? '전세' : '월세'}
                      </button>
                    ))}
                </div>
            </div>

            {/* 3. 가격 필터 섹션 (입력창 + 토글 버튼) */}
            <div className={styles.priceFilterSection}>
                {/* 가격 입력창은 토글 버튼을 눌러야 나타나도록 변경 */}
                <button
                    type="button"
                    className={styles.priceFilterToggleButton}
                    onClick={() => setIsPriceFilterVisible(prev => !prev)}
                >
                    {isPriceFilterVisible ? '▲ 가격 필터 닫기' : '▼ 가격대 설정'}
                </button>
            </div>

            {/* ★ 가격 필터 상세 박스 (토글) -> 순서 변경 및 체크박스 제거 */}
            {isPriceFilterVisible && (
                <div className={styles.detailedPriceBox}>
                    
                    {/* A. 권리금 그룹 ★ NEW / ORDER 1 */}
                    <div className={styles.priceGroup}>
                        <div className={styles.priceGroupHeader}>
                          <span className={styles.priceTargetLabel}>권리금 (만원)</span>
                          <div className={styles.priceInputRow}>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최소 금액"
                                value={premiumMin} 
                                onChange={(e) => setPremiumMin(e.target.value)} 
                                min="0"
                            />
                            <span className={styles.priceRangeSeparator}>~</span>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최대 금액"
                                value={premiumMax} 
                                onChange={(e) => setPremiumMax(e.target.value)} 
                                min="0"
                            />
                          </div>
                        </div>
                    </div>
                    
                    {/* B. 일시금/보증금 그룹 ★ MODIFIED LABEL / ORDER 2 */}
                    <div className={styles.priceGroup}>
                        <div className={styles.priceGroupHeader}>
                          <span className={styles.priceTargetLabel}>매매, 전세, 보증금 (만원)</span>
                          <div className={styles.priceInputRow}>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최소 금액"
                                value={lumpSumMin}
                                onChange={(e) => setLumpSumMin(e.target.value)}
                                min="0"
                            />
                            <span className={styles.priceRangeSeparator}>~</span>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최대 금액"
                                value={lumpSumMax}
                                onChange={(e) => setLumpSumMax(e.target.value)}
                                min="0"
                            />
                          </div>
                        </div>
                    </div>

                    {/* C. 월세 금액 그룹 ★ ORDER 3 */}
                    <div className={styles.priceGroup}>
                        <div className={styles.priceGroupHeader}>
                          <span className={styles.priceTargetLabel}>월세 금액 (만원)</span>
                          <div className={styles.priceInputRow}>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최소 월세"
                                value={rentMin}
                                onChange={(e) => setRentMin(e.target.value)}
                                min="0"
                            />
                            <span className={styles.priceRangeSeparator}>~</span>
                            <input
                                className={`${styles.filterInput} ${styles.filterPriceInput}`}
                                type="number"
                                placeholder="최대 월세"
                                value={rentMax}
                                onChange={(e) => setRentMax(e.target.value)}
                                min="0"
                            />
                          </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
        {/* --- (검색 및 필터 영역 종료) --- */}

        {loading && <p>매물 목록을 불러오는 중...</p>}
        {!loading && properties.length === 0 && (
          <p className={styles.emptyText}>등록된 매물이 없습니다. 왼쪽 폼에서 새 매물을 등록하세요.</p>
        )}
        
        {!loading && properties.length > 0 && filteredAndSearchedProperties.length === 0 && (
            <p className={styles.emptyText}>검색 및 필터 조건에 맞는 매물이 없습니다.</p>
        )}

        {/* 매물 리스트 테이블 (컬럼 조정) */}
        <div className={styles.table}>
          {/* 테이블 헤더: 가격(col3) -> 세구분(col3) + 가격(col4_1) */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>주소/건물명</div>
            <div className={styles.col2}>유형</div> 
            <div className={styles.col3}>세구분</div> 
            <div className={styles.col4_1}>가격</div> 
            <div className={styles.col5}>상태</div> 
            <div className={styles.col6}>메모/키워드</div> 
            <div className={styles.col7}>등록일</div> 
            <div className={styles.col8}>관리</div> 
          </div>
          <div>
            {filteredAndSearchedProperties.map(pin => {
              const priceData = formatPrice(pin); // 새로운 가격 데이터 구조 사용

              // 주소 포맷팅: '충청남도' -> '충남'으로 통일
              const fullAddress = pin.address || '주소 로딩 중...';
              const shortAddress = fullAddress.replace('충청남도', '충남');

              return (
                <div
                  key={pin.id}
                  className={styles.tableRow}
                >
                  <div className={styles.col1}>
                    {/* 건물명 (괄호 안에 표시) */}
                    <span className={styles.addressText}>
                      ({pin.building_name || '건물명 없음'})
                    </span>
                    {/* 짧은 주소 (충청남도 -> 충남) */}
                    <span className={styles.memoText}>
                      {shortAddress}
                    </span>
                    <span className={styles.memoText}>{pin.detailed_address || ''}</span>
                  </div>
                  <div className={styles.col2}>
                      <span className={styles.typeText}>
                          {pin.property_type || '-'}
                      </span>
                      <span className={styles.typeEtcText}>
                          {pin.property_type === '기타' && pin.property_type_etc ? `(${pin.property_type_etc})` : ''}
                      </span>
                  </div>
                  <div className={styles.col3}> {/* 세구분 */}
                    <div className={styles.priceMultiLine}>{priceData.transactionType || '-'}</div>
                  </div>
                  <div className={styles.col4_1}> {/* 가격 */}
                    {/* dangerouslySetInnerHTML을 사용하여 HTML 포맷팅 적용 */}
                    <div className={styles.priceMultiLine} dangerouslySetInnerHTML={{ __html: priceData.priceDetail || '-' }} />
                  </div>
                  <div className={styles.col5}> {/* 상태 (위치 조정) */}
                    <span className={styles.statusText}>{formatStatus(pin)}</span>
                  </div>
                  <div className={styles.col6}> {/* 메모/키워드 (위치 조정) */}
                    {pin.notes || '-'}
                    <span className={styles.keywordsText}>{pin.keywords}</span>
                  </div>
                  <div className={styles.col7}>{formatDate(pin.created_at)}</div> {/* 등록일 (위치 조정) */}
                  <div className={styles.col8}> {/* 관리 (위치 조정) */}
                    <button
                      onClick={() => handleDeleteProperty(pin.id)}
                      className={styles.deleteButton}
                      disabled={loading}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  )
}