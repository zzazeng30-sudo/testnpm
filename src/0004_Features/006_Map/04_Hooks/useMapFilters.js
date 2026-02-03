/**
 * [Revision Info]
 * Rev: 2.0 (Extended 3-Tier Filters)
 * Author: AI Assistant
 */
import { useState, useMemo } from 'react';

export default function useMapFilters(pins) {
  const [filterType, setFilterType] = useState('전체');        // 유형: 토지, 아파트 등
  const [filterTransaction, setFilterTransaction] = useState('전체'); // 거래: 매매, 전세 등
  const [filterStatus, setFilterStatus] = useState('전체');      // 상태: 거래전, 중, 완료

  const filteredPins = useMemo(() => {
    if (!pins) return [];
    
    return pins.filter(pin => {
      // 1. 유형 필터
      const matchType = filterType === '전체' || pin.property_type === filterType;
      
      // 2. 거래 필터
      const matchTransaction = filterTransaction === '전체' || (
        (filterTransaction === '매매' && pin.is_sale) ||
        (filterTransaction === '전세' && pin.is_jeonse) ||
        (filterTransaction === '월세' && pin.is_rent)
      );

      // 3. 상태 필터
      const matchStatus = filterStatus === '전체' || pin.status === filterStatus;

      return matchType && matchTransaction && matchStatus;
    });
  }, [pins, filterType, filterTransaction, filterStatus]);

  return { 
    filterType, setFilterType, 
    filterTransaction, setFilterTransaction,
    filterStatus, setFilterStatus,
    filteredPins 
  };
}