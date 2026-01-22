// src/services/buildingService.js

// ★ 본인의 공공데이터포털 인증키 (Decoding) 입력
const API_KEY = "1901e179822c234a1ffe8b565931e8c64085d5ceb8002f7e249330174dfc0d25";

const API_OPERATIONS = {
  1: "getBrBasisOulnInfo",
  2: "getBrRecapTitleInfo",
  3: "getBrTitleInfo",
  4: "getBrFlrOulnInfo",
  5: "getBrAtchJibunInfo",
  6: "getBrExposPubuseAreaInfo",
  7: "getBrWclfInfo",
  8: "getBrHsprcInfo",
  9: "getBrExposInfo",
  10: "getBrJijiguInfo"
};

const parsePnu = (pnu) => {
  if (!pnu || pnu.length < 19) return null;
  return {
    sigunguCd: pnu.substring(0, 5),
    bjdongCd: pnu.substring(5, 10),
    bun: pnu.substring(11, 15),
    ji: pnu.substring(15, 19)
  };
};

// ★ [HTTPS 에러 해결 핵심] 직접 URL 호출 금지 -> 오라클 프록시 경유
const fetchApi = async (operation, params) => {
  try {
    const queryParams = new URLSearchParams({
      endpoint: operation,
      serviceKey: API_KEY,
      sigunguCd: params.sigunguCd,
      bjdongCd: params.bjdongCd,
      bun: params.bun,
      ji: params.ji,
      numOfRows: "100",
      pageNo: "1",
      _type: "json"
    });

    // 프록시 서버 호출 (이게 있어야 HTTPS 환경에서 작동함)
    const response = await fetch(`/api/proxy/gov-data-proxy?${queryParams.toString()}`);
    
    if (!response.ok) throw new Error(`Proxy Error: ${response.status}`);
    const data = await response.json();
    
    if (!data.response?.body?.items) return null;
    const items = data.response.body.items.item;
    return Array.isArray(items) ? items : [items];

  } catch (error) {
    console.error(`API Error (${operation}):`, error);
    return null;
  }
};

export const fetchFineGrainedData = async (pnu, targetCatIds = []) => {
  const code = parsePnu(pnu);
  if (!code) return "PNU 오류";

  let operationsToFetch = [...targetCatIds];
  if (operationsToFetch.includes(1) && !operationsToFetch.includes(3)) {
    operationsToFetch.push(3);
  }

  // 5개씩 동시 요청 (속도 향상)
  const promises = Object.entries(API_OPERATIONS)
    .filter(([catId]) => operationsToFetch.includes(parseInt(catId)))
    .map(async ([catId, operation]) => {
      const result = await fetchApi(operation, code);
      return { catId: parseInt(catId), data: result };
    });

  if (promises.length === 0) return "선택된 항목 없음";

  const results = await Promise.all(promises);
  let mergedData = {};
  let hasMeaningfulData = false;

  results.forEach(({ catId, data }) => {
    if (!data || data.length === 0) return;
    if (catId === 4) {
      mergedData.floorDetails = data;
      if (data.some(f => f.area && parseFloat(f.area) > 0)) hasMeaningfulData = true;
    } else if ([5, 6, 7, 8, 9, 10].includes(catId)) {
        mergedData[`list_cat_${catId}`] = data;
        if (data.length > 0) Object.assign(mergedData, data[0]);
        hasMeaningfulData = true;
    } else {
      if (data.length > 0) {
        Object.assign(mergedData, data[0]);
        hasMeaningfulData = true;
      }
    }
  });

  return hasMeaningfulData ? mergedData : "데이터 없음";
};