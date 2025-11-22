import { useState, useMemo } from 'react';

export default function useMapFilters(pins) {
  const [filterPropertyType, setFilterPropertyType] = useState('ALL');
  const [filterTransactionType, setFilterTransactionType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // 필터링 로직 (useMemo로 최적화)
  const filteredPins = useMemo(() => {
    let result = [...pins];

    if (filterPropertyType !== 'ALL') {
      result = result.filter(p => p.property_type === filterPropertyType);
    }

    if (filterTransactionType !== 'ALL') {
      if (filterTransactionType === '매매') result = result.filter(p => p.is_sale);
      else if (filterTransactionType === '전세') result = result.filter(p => p.is_jeonse);
      else if (filterTransactionType === '월세') result = result.filter(p => p.is_rent);
    }

    if (filterStatus !== 'ALL') {
      result = result.filter(p => p.status === filterStatus);
    }

    return result;
  }, [pins, filterPropertyType, filterTransactionType, filterStatus]);

  return {
    filterPropertyType, setFilterPropertyType,
    filterTransactionType, setFilterTransactionType,
    filterStatus, setFilterStatus,
    filteredPins
  };
}