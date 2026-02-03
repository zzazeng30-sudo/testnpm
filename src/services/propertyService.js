/**
 * [Revision Info]
 * Rev: 16.0 (Restore & Merge)
 * - 기능 복구: 등록(create), 수정(update), 삭제(delete), 이미지 업로드 기능 완벽 복구
 * - 호환성 수정: 함수 이름을 'getProperties' -> 'getPropertiesWithFilter'로 변경 (useProperty.js와 연결)
 */
import { supabase } from '../0005_Lib/supabaseClient';

const TABLE_NAME = 'pins'; 
const BUCKET_NAME = 'pins_photos'; // 스토리지 버킷 이름 (Supabase 설정과 일치해야 함)

export const propertyService = {
  /**
   * 1. 매물 조회 (필터링 포함)
   * ★ 중요: 다른 파일(useProperty, useMapData)에서 이 이름(getPropertiesWithFilter)으로 호출하므로 이름을 유지합니다.
   */
  async getPropertiesWithFilter({ userId, page = 0, pageSize = 50, filters = {} }) {
    if (!userId) return { data: [], count: 0, error: null };

    const from = page * pageSize;
    const to = from + pageSize - 1;

    // Supabase RLS 준수를 위해 user_id 사용
    let query = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // 1-1. 통합 검색
    if (filters.searchQuery?.trim()) {
      const search = filters.searchQuery.trim();
      query = query.or(`address.ilike.%${search}%,building_name.ilike.%${search}%,notes.ilike.%${search}%,keywords.ilike.%${search}%`);
    }

    // 1-2. 상태 필터
    if (filters.status && filters.status !== 'ALL') {
      const original = filters.status;
      const stripped = filters.status.replace(/\s/g, ''); 
      query = query.or(`status.eq."${original}",status.eq."${stripped}"`);
    }

    // 1-3. 유형 필터
    if (filters.property_type && filters.property_type !== 'ALL') {
      query = query.eq('property_type', filters.property_type);
    }

    // 1-4. 가격 필터
    const { filterMode, priceFilter } = filters;
    if (filterMode && filterMode !== 'ALL') {
      const mode = filterMode.toUpperCase();
      
      if (mode === 'SALE') query = query.eq('is_sale', true);
      else if (mode === 'JEONSE') query = query.eq('is_jeonse', true);
      else if (mode === 'RENT') query = query.eq('is_rent', true);

      const targetCol = mode === 'SALE' ? 'sale_price' : mode === 'JEONSE' ? 'jeonse_deposit' : 'rent_deposit';
      
      if (priceFilter?.val1Min) query = query.gte(targetCol, Number(priceFilter.val1Min));
      if (priceFilter?.val1Max) query = query.lte(targetCol, Number(priceFilter.val1Max));
    }

    // 페이징 처리
    query = query.range(from, to);

    const { data, error, count } = await query;
    return { data, count, error };
  },

  /**
   * 2. 매물 등록
   */
  async createProperty(propertyData) {
    // 보안: user_id 필수 체크
    if (!propertyData.user_id) return { error: new Error("사용자 정보(user_id)가 없습니다.") };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([propertyData])
      .select();
    return { data, error };
  },

  /**
   * 3. 매물 수정
   */
  async updateProperty(pinId, propertyData) {
    if (!pinId) return { error: new Error("수정할 매물의 ID가 없습니다.") };
    
    // 수정 시 소유자(user_id) 변경 방지
    const { user_id, ...updates } = propertyData;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', pinId)
      .select();
    return { data, error };
  },

  /**
   * 4. 매물 삭제 (단건)
   */
  async deleteProperty(pinId) {
    if (!pinId) return { error: new Error("삭제할 ID가 없습니다.") };
    return await supabase.from(TABLE_NAME).delete().eq('id', pinId);
  },

  /**
   * 4-1. 매물 삭제 (다건)
   */
  async deleteProperties(pinIds) {
    if (!pinIds || pinIds.length === 0) return { error: new Error("삭제할 대상이 없습니다.") };
    return await supabase.from(TABLE_NAME).delete().in('id', pinIds);
  },

  /**
   * 5. 이미지 업로드
   */
  async uploadPropertyImage(file) {
    if (!file) throw new Error("업로드할 파일이 없습니다.");
    
    const fileExt = 'webp';
    // 파일명 충돌 방지를 위한 랜덤 문자열 생성
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  }
};
