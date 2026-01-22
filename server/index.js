const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 세움터 접속 전용 설정
const seumter = axios.create({
  baseURL: 'https://www.eais.go.kr',
  withCredentials: true,
  maxRedirects: 0, // 무한 리다이렉트 방지를 위해 직접 제어
  validateStatus: (status) => status >= 200 && status < 400, // 302 리다이렉트도 에러로 처리하지 않음
  headers: {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json;charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'untclsfcd': '1000',
    'Origin': 'https://www.eais.go.kr',
    'Referer': 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

app.post('/api/seumter-extract', async (req, res) => {
  const { id, pw, address } = req.body;
  const GITHUB_URL = "https://raw.githubusercontent.com/zzazeng30-sudo/dataqjqwjd/main/20260201dong.csv";

  try {
    console.log(`\n--- 🔍 [${address}] 작업 디버깅 시작 ---`);

    // [1단계] 로그인 요청 (AWPABB01R01)
    const loginPayload = { loginId: id, loginPwd: pw };
    console.log(`1️⃣ [송신] 로그인 정보 전송: ID=${id}`);
    const loginRes = await seumter.post('/awp/AWPABB01R01', loginPayload);
    
    // 수동 쿠키 관리 (중요)
    const cookies = loginRes.headers['set-cookie'] || [];
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    if (!loginRes.data.sessionRep?.membId) {
        console.log("❌ [수신] 로그인 실패 응답:", loginRes.data);
        return res.status(401).json({ success: false, error: "아이디/비번 불일치" });
    }
    console.log(`✅ [수신] 로그인 성공: ${loginRes.data.sessionRep.sessionUserNm}님`);

    // [2단계] 세션 확정 (CBAAZA02R01)
    console.log("2️⃣ [송신] 세션 확정 요청 중...");
    const sessionRes = await seumter.get('/cba/CBAAZA02R01', { headers: { Cookie: cookieHeader } });
    console.log("✅ [수신] 세션 확정 응답:", sessionRes.data.caisMessage?.resultMsg || "성공");

    // [3단계] 장바구니 비우기
    console.log("3️⃣ [송신] 장바구니 조회 요청...");
    const cartListRes = await seumter.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 }, { headers: { Cookie: cookieHeader } });
    const items = cartListRes.data.findPbsvcResveDtls || [];
    console.log(`✅ [수신] 기존 장바구니 건수: ${items.length}건`);

    for (const item of items) {
      await seumter.post('/bci/BCIAAA02D01', item, { headers: { Cookie: cookieHeader } });
    }

    // [4단계] 주소 매핑 및 검색 (CSV)
    const csvRes = await axios.get(GITHUB_URL);
    const bunjiMatch = address.match(/(\d+)(-(\d+))?$/);
    const addrParts = address.trim().split(/\s+/);
    const keywords = addrParts.filter(p => isNaN(parseInt(p.replace(/-/g, ""))));

    let mapping = null;
    for (let line of csvRes.data.split(/\r?\n/)) {
        const clean = line.replace(/["\r]/g, '').trim();
        if (keywords.every(k => clean.includes(k))) {
            const cols = clean.split(',');
            mapping = { sigungu: cols[0].substring(0, 5), bjdong: cols[0].substring(5, 10) };
            break;
        }
    }
    if (!mapping) throw new Error("지역 매핑 실패");

    const TARGET = {
      reqSigunguCd: mapping.sigungu, bjdongCd: mapping.bjdong,
      mnnm: bunjiMatch[1].padStart(4, '0'), slno: (bunjiMatch[3] || "0").padStart(4, '0')
    };

    console.log(`4️⃣ [송신] 주소 검색 요청: ${mapping.sigungu}-${mapping.bjdong}`);
    const searchRes = await seumter.post('/bci/BCIAAA02R01', { addrGbCd: "0", inqireGbCd: "0", ...TARGET }, { headers: { Cookie: cookieHeader } });
    const bld = searchRes.data.jibunAddr?.[0];
    if (!bld) throw new Error("건물 정보 없음");
    console.log(`✅ [수신] 검색된 주소: ${bld.locDetlAddr}`);

    // [5단계] 장바구니 담기 및 최종 신청
    console.log("5️⃣ [송신] 장바구니 담기 및 민원 신청 발송...");
    await seumter.post('/bci/BCIAAA02C01', {
      bldrgstSeqno: bld.bldrgstSeqno, regstrGbCd: bld.regstrGbCd || "1", regstrKindCd: bld.regstrKindCd || "2",
      locSigunguCd: TARGET.reqSigunguCd, locBjdongCd: TARGET.bjdongCd, locDetlAddr: bld.locDetlAddr,
      locMnnm: TARGET.mnnm, locSlno: TARGET.slno
    }, { headers: { Cookie: cookieHeader } });

    await seumter.post('/bci/BCIAAA02D02', { lastUpdusrId: "auto_user" }, { headers: { Cookie: cookieHeader } });
    
    console.log("⏳ 리포트 생성 대기 (8초)...");
    await new Promise(r => setTimeout(r, 8000));

    // [이후 과정은 데이터 파싱 - 기존 로직과 동일]
    const histRes = await seumter.post('/bci/BCIAAA06R01', {
      firstSaveEndDate: new Date().toISOString().slice(0, 10),
      firstSaveStartDate: new Date().toISOString().slice(0, 10),
      pageYn: "N", progStateFlagArr: ["01"], recordSize: 10
    }, { headers: { Cookie: cookieHeader } });

    const successItem = histRes.data.IssueReadHistList?.[0];
    if (!successItem) throw new Error("리포트 조회 실패");

    // ClipReport 해독 로직 수행...
    res.json({ success: true, ownerList: [/* 추출 결과 */] });

  } catch (err) {
    console.error("⛔ [디버깅 에러]:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => console.log('🚀 디버깅 서버 실행 중: http://localhost:5000'));