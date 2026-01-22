import axios from 'axios';

export const seumterService = {
  getOwnerInfo: async (address, id, pw) => {
    try {
      // [핵심] http://144... 주소 대신 Vercel 상대 경로 사용
      const response = await axios.post(`/api/proxy/scrape`, {
        id,
        pw,
        address
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "데이터 수집 실패");
      }
    } catch (error) {
      console.error("세움터 서비스 에러:", error);
      // 서버에서 전달한 에러 메시지(예: 로그인 실패)를 그대로 전달
      throw error;
    }
  }
};