/**
 * [세움터 독립 통합 서비스]
 * 기존 서비스와 별개로 로그인 -> 건수 통계 -> 알림창 로직을 담당합니다.
 */
const BASE_URL = "https://www.eais.go.kr";
const HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json;charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest'
};

export const seumterIntegration = {
    // 1. 세움터 로그인 및 세션 확정
    executeLogin: async (id, pw) => {
        const loginPayload = { loginId: id, loginPwd: pw };
        await fetch(`${BASE_URL}/awp/AWPABB01R01`, { 
            method: 'POST', headers: HEADERS, credentials: 'include', body: JSON.stringify(loginPayload) 
        });
        await fetch(`${BASE_URL}/cba/CBAAZA02R01`, { method: 'GET', headers: HEADERS, credentials: 'include' });
    },

    // 2. 대장 유형별 건수 조회 및 상세 목록 반환
    fetchBuildingData: async (sigunguCd, bjdongCd, mnnm, slno) => {
        // 상위 시퀀스 조회 (R01)
        const r01Res = await fetch(`${BASE_URL}/bci/BCIAAA02R01`, { 
            method: "POST", headers: HEADERS, 
            body: JSON.stringify({ addrGbCd: "0", inqireGbCd: "0", reqSigunguCd: sigunguCd, bjdongCd: bjdongCd, mnnm, slno }) 
        });
        const r01Data = await r01Res.json();
        const targetSeqList = [...(r01Data.jibunAddr || []), ...(r01Data.bldrgstList || [])].map(b => b.bldrgstSeqno);

        // 상세 목록 조회 (R04)
        const r04Res = await fetch(`${BASE_URL}/bci/BCIAAA02R04`, { 
            method: "POST", headers: HEADERS, 
            body: JSON.stringify({ inqireGbCd: "0", reqSigunguCd: sigunguCd, upperBldrgstSeqnos: targetSeqList }) 
        });
        const r04Data = await r04Res.json();
        const list = r04Data.findExposList || [];

        // 유형별 건수 요약
        return {
            totalHeader: r01Data.jibunAddr?.length || 0, // 총괄표제부
            normal: list.filter(u => u.regstrGbCd === "1").length, // 일반/표제부
            expos: list.filter(u => u.regstrKindCd === "4").length, // 전유부
            fullList: list
        };
    }
};