import axios from 'axios';

export const seumterIntegration = {
  // 1. 동/호수 목록만 먼저 가져오는 함수 (팝업 띄우기용)
  getUnitList: async (address) => {
    try {
      // 신규 서버(3002번 포트)를 바라보는 Vercel 경로 사용
      const response = await axios.post(`/api/v2/units`, { address });
      return response.data.units; // [{dong: '101동', ho: '101호', area: '59.64', seqNo: '...'}]
    } catch (error) {
      console.error("호수 목록 조회 에러:", error);
      throw error;
    }
  },

  // 2. 선택된 호수를 진짜 분석하는 함수
  scrapeUnitDetail: async (id, pw, unitData) => {
    try {
      const response = await axios.post(`/api/v2/scrape-detail`, {
        id, pw, 
        bldrgstSeqno: unitData.seqNo, // 사용자가 팝업에서 선택한 고유번호
        address: unitData.fullAddress 
      });
      return response.data.data;
    } catch (error) {
      console.error("전유부 상세 분석 에러:", error);
      throw error;
    }
  }
};
