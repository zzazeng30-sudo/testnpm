import React from 'react';
import { useMap } from '../../../../contexts/MapContext';
// ▼ [수정] 경로 변경
import styles from '../../pages/MapPage.module.css';

export default function MapFilters() {
  const {
    filterPropertyType, setFilterPropertyType,
    filterTransactionType, setFilterTransactionType,
    filterStatus, setFilterStatus,
  } = useMap();

  return (
    <div className={styles.mapFilterContainer}>
       <select className={styles.mapFilterSelect} value={filterPropertyType} onChange={(e) => setFilterPropertyType(e.target.value)}>
        <option value="ALL">전체 유형</option>
        <option value="주택">주택</option>
        <option value="상가">상가</option>
        <option value="토지">토지</option>
        <option value="아파트">아파트</option>
        <option value="기타">기타</option>
      </select>
      <select className={styles.mapFilterSelect} value={filterTransactionType} onChange={(e) => setFilterTransactionType(e.target.value)}>
        <option value="ALL">전체 거래</option>
        <option value="매매">매매</option>
        <option value="전세">전세</option>
        <option value="월세">월세</option>
      </select>
      <select className={styles.mapFilterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
        <option value="ALL">전체 상태</option>
        <option value="거래전">거래전</option>
        <option value="거래중">거래중</option>
        <option value="거래완료">거래완료</option>
      </select>
    </div> 
  );
}