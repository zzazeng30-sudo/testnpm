/**
 * [Revision Info]
 * Rev: 2.0 (Server-side Pagination & Filter Support)
 * Author: Gemini AI
 */
import { useState, useCallback } from 'react';
import { propertyService } from '../../../services/propertyService';

export const useProperty = (session) => {
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0); // 전체 매물 개수 저장
  const [loading, setLoading] = useState(false);

  // 1. 매물 불러오기 (페이지 번호와 필터 객체를 인자로 받음)
  const fetchProperties = useCallback(async (page = 0, filters = {}) => {
    if (!session?.user?.id) return;

    setLoading(true);
    
    // 개편된 서비스 호출 (페이지당 50개씩)
    const { data, count, error } = await propertyService.getPropertiesWithFilter({
      userId: session.user.id,
      page: page,
      pageSize: 50,
      filters: filters
    });

    if (error) {
      console.error('❌ 매물 로드 실패:', error.message);
    } else {
      setProperties(data || []);
      setTotalCount(count || 0); // 서버에서 준 전체 개수 업데이트
      console.log(`✅ ${page + 1}페이지 로드 성공 (검색결과 총 ${count}건)`);
    }
    setLoading(false);
  }, [session]);

  // 2. 매물 등록하기 (등록 후 목록 갱신을 위해 fetchProperties를 직접 호출하지 않음)
  const addProperty = async (newPropertyData) => {
    setLoading(true);
    const { data, error } = await propertyService.createProperty(newPropertyData);

    if (error) {
      alert("등록 실패: " + error.message);
      setLoading(false);
      return { success: false };
    } else {
      setLoading(false);
      return { success: true };
    }
  };

  // 3. 매물 삭제하기
  const deleteProperty = async (pinId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await propertyService.deleteProperty(pinId);
    if (error) {
      alert("삭제 실패");
      return false;
    }
    return true;
  };

  return { 
    properties, 
    totalCount, 
    loading, 
    fetchProperties, 
    addProperty, 
    deleteProperty 
  };
};