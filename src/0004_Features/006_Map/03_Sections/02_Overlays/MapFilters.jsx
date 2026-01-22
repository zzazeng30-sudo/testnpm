import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapOverlays.module.css';

const MapFilters = () => {
  const { 
    filterType, setFilterType, 
    filterTransaction, setFilterTransaction,
    filterStatus, setFilterStatus,
    zoomLevel 
  } = useMap();

  // [수정됨] 데스크탑 스타일: position 관련 속성 제거 (부모 topFilterBar가 위치 잡음)
  const containerStyle = {
    // position: 'absolute', ... (제거됨) -> 부모 div가 위치를 결정함
    display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)', padding: '6px 20px',
    borderRadius: '40px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #eee',
    boxSizing: 'border-box', whiteSpace: 'nowrap'
  };

  const selectStyle = {
    border: '2px solid transparent', background: 'none', fontSize: '14px', fontWeight: '800',
    color: '#1f2937', outline: 'none', cursor: 'pointer', padding: '4px 10px',
    borderRadius: '20px', textAlign: 'center', textAlignLast: 'center',
    transition: 'all 0.2s ease', appearance: 'none', minWidth: '90px'
  };
  
  const dividerStyle = { width: '1px', height: '14px', backgroundColor: '#e5e7eb', margin: '0 8px', flexShrink: 0 };
  const handleFocus = (e) => { e.target.style.borderColor = '#2563eb'; };
  const handleBlur = (e) => { e.target.style.borderColor = 'transparent'; };

  return (
    <>
      {/* ==================================================================
          [데스크탑 뷰] 기존 디자인 유지 (위치 간섭 해결)
      ================================================================== */}
      <div className={styles.desktopFilterWrapper} style={containerStyle}>
        <div style={{fontSize:'12px', color:'#9ca3af', fontWeight:'800', padding: '0 8px'}}>
          LV.{zoomLevel}
        </div>
        <div style={dividerStyle} />
        <select style={selectStyle} value={filterType} onChange={(e) => setFilterType(e.target.value)} onFocus={handleFocus} onBlur={handleBlur}>
          <option value="전체">전체유형</option>
          <option value="아파트">아파트</option>
          <option value="오피스텔">오피스텔</option>
          <option value="빌라">빌라</option>
          <option value="상가">상가</option>
          <option value="사무실">사무실</option>
          <option value="토지">토지</option>
        </select>
        <div style={dividerStyle} />
        <select style={selectStyle} value={filterTransaction} onChange={(e) => setFilterTransaction(e.target.value)} onFocus={handleFocus} onBlur={handleBlur}>
          <option value="전체">전체거래</option>
          <option value="매매">매매</option>
          <option value="전세">전세</option>
          <option value="월세">월세</option>
        </select>
        <div style={dividerStyle} />
        <select style={selectStyle} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} onFocus={handleFocus} onBlur={handleBlur}>
          <option value="전체">전체상태</option>
          <option value="거래전">거래전</option>
          <option value="거래중">거래중</option>
          <option value="거래완료">거래완료</option>
        </select>
      </div>

      {/* ==================================================================
          [모바일 뷰] 왼쪽 정렬 & 트렌디 칩 스타일
      ================================================================== */}
      <div className={styles.mobileFilterContainer}>
        {/* 1. 유형 필터 */}
        <select 
          className={styles.mobileChipSelect} 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          data-active={filterType !== '전체'}
        >
          <option value="전체">건물유형 ▾</option>
          <option value="아파트">아파트</option>
          <option value="오피스텔">오피스텔</option>
          <option value="빌라">빌라</option>
          <option value="상가">상가</option>
          <option value="사무실">사무실</option>
          <option value="토지">토지</option>
        </select>

        {/* 2. 거래 필터 */}
        <select 
          className={styles.mobileChipSelect} 
          value={filterTransaction} 
          onChange={(e) => setFilterTransaction(e.target.value)}
          data-active={filterTransaction !== '전체'}
        >
          <option value="전체">거래방식 ▾</option>
          <option value="매매">매매</option>
          <option value="전세">전세</option>
          <option value="월세">월세</option>
        </select>

        {/* 3. 상태 필터 */}
        <select 
          className={styles.mobileChipSelect} 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          data-active={filterStatus !== '전체'}
        >
          <option value="전체">매물상태 ▾</option>
          <option value="거래전">거래전</option>
          <option value="거래중">거래중</option>
          <option value="거래완료">완료</option>
        </select>
      </div>
    </>
  );
};

export default MapFilters;