/**
 * [Revision Info]
 * Rev: 2.8 (Server-side Trigger for Map)
 * Author: Gemini AI
 */
import { useState, useCallback, useEffect } from 'react';
import { propertyService } from '../../../services/propertyService';

export default function useMapData(session, statusFilter = 'ALL') {
  const [pins, setPins] = useState([]); 
  const [loading, setLoading] = useState(false);

  const fetchPins = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      console.log(`🔄 [MapData] ${statusFilter} 데이터 서버 요청 중...`);
      
      // 지도는 전체 데이터를 한 화면에 뿌려야 하므로 pageSize를 넉넉히 잡습니다.
      const { data, error } = await propertyService.getPropertiesWithFilter({
        userId: session.user.id,
        page: 0,
        pageSize: 3000, // 매물이 많아져도 누락되지 않게 충분히 크게 설정
        filters: {
          searchQuery: '',
          status: statusFilter, // 선택된 필터(거래완료 등)를 서버에 직접 전달
          property_type: 'ALL',
          filterMode: 'ALL',
          priceFilter: {
            val1Min: '', val1Max: '',
            val2Min: '', val2Max: '',
            premiumMin: '', premiumMax: ''
          }
        } 
      });
      
      if (error) throw error;
      setPins(data || []);
      console.log(`✅ [MapData] ${statusFilter} 로드 성공: ${data?.length || 0}건`);
      
    } catch (err) {
      console.error("❌ [MapData] 로드 실패:", err.message);
      setPins([]); 
    } finally {
      setLoading(false);
    }
  }, [session, statusFilter]); // statusFilter가 바뀔 때마다 fetchPins가 다시 생성됨

  // statusFilter가 변경될 때마다 데이터를 새로 가져옵니다.
  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleDeletePin = useCallback(async (pinId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await propertyService.deleteProperty(pinId);
      await fetchPins();
    } catch (err) {
      alert("삭제 실패");
    }
  }, [fetchPins]);

  return { pins, loading, fetchPins, handleDeletePin };
}