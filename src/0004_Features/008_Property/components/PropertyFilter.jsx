/**
 * [Revision Info]
 * Rev: 2.6 (Grouped UI & Status Update)
 * Author: Gemini AI
 * 1. 필터 순서 변경: 유형 > 상태 > 거래방식 > 가격
 * 2. 상태 옵션 변경: 거래전, 거래중, 거래 완료
 * 3. 시각적 그룹화 적용
 */
import React from 'react';
import styles from '../PropertyPage.module.css';

const PropertyFilter = ({
  searchQuery, setSearchQuery,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  filterMode, setFilterMode,
  priceFilter, setPriceFilter
}) => {
  
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceFilter(prev => ({ ...prev, [name]: value }));
  };

  const labels = {
    SALE: { v1: '매매가', v2: '보증금' },
    JEONSE: { v1: '전세금', v2: '보증금' },
    RENT: { v1: '월세', v2: '보증금' },
    ALL: { v1: '매매/전세/월세', v2: '보증금' }
  };

  const currentLabels = labels[filterMode] || labels.ALL;

  return (
    <div className={styles.filterSectionCard}>
      {/* 상단 통합 검색 바 */}
      <div className={styles.searchBarWrapper}>
        <div className={styles.searchIcon}>🔍</div>
        <input
          className={styles.mainSearchInput}
          type="text"
          placeholder="주소, 키워드, 메모 통합 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.filterOptionsGrid}>
        {/* 그룹 1: 기본 분류 (유형 & 상태) */}
        <div className={styles.filterSubGroup}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>매물 유형</label>
            <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="ALL">전체 유형</option>
              <option value="아파트">아파트</option>
              <option value="주택">주택</option>
              <option value="상가">상가</option>
              <option value="토지">토지</option>
              <option value="사무실">사무실</option>
              <option value="공장/창고">공장/창고</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>매물 상태</label>
            <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">전체 상태</option>
              <option value="거래전">거래전</option>
              <option value="거래중">거래중</option>
              <option value="거래 완료">거래 완료</option>
            </select>
          </div>
        </div>

        {/* 그룹 2: 거래 방식 */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>거래 방식</label>
          <div className={styles.tabButtonGroup}>
            {['ALL', 'SALE', 'JEONSE', 'RENT'].map((mode) => (
              <button
                key={mode}
                className={`${styles.tabButton} ${filterMode === mode ? styles.tabActive : ''}`}
                onClick={() => setFilterMode(mode)}
              >
                {mode === 'ALL' ? '전체' : mode === 'SALE' ? '매매' : mode === 'JEONSE' ? '전세' : '월세'}
              </button>
            ))}
          </div>
        </div>

        {/* 그룹 3: 상세 가격 설정 */}
        <div className={styles.filterSubGroup}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{currentLabels.v1}</label>
            <div className={styles.rangeInputWrapper}>
              <input name="val1Min" className={styles.rangeInput} type="number" placeholder="최소" value={priceFilter.val1Min || ''} onChange={handlePriceChange} />
              <span className={styles.rangeDash}>~</span>
              <input name="val1Max" className={styles.rangeInput} type="number" placeholder="최대" value={priceFilter.val1Max || ''} onChange={handlePriceChange} />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>{currentLabels.v2}</label>
            <div className={styles.rangeInputWrapper}>
              <input name="val2Min" className={styles.rangeInput} type="number" placeholder="최소" value={priceFilter.val2Min || ''} onChange={handlePriceChange} />
              <span className={styles.rangeDash}>~</span>
              <input name="val2Max" className={styles.rangeInput} type="number" placeholder="최대" value={priceFilter.val2Max || ''} onChange={handlePriceChange} />
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>권리금</label>
            <div className={styles.rangeInputWrapper}>
              <input name="premiumMin" className={styles.rangeInput} type="number" placeholder="최소" value={priceFilter.premiumMin || ''} onChange={handlePriceChange} />
              <span className={styles.rangeDash}>~</span>
              <input name="premiumMax" className={styles.rangeInput} type="number" placeholder="최대" value={priceFilter.premiumMax || ''} onChange={handlePriceChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyFilter;