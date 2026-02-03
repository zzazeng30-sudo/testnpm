const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const https = require('https'); // HTTPS 에이전트용

const app = express();
const PORT = 3001;

// CORS 설정
app.use(cors());
app.use(bodyParser.json());

// ★ [필수] 브라우저 위장 헤더 (세움터용)
const BROWSER_HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json;charset=UTF-8', 
    'X-Requested-With': 'XMLHttpRequest', 
    'untclsfcd': '1000',                  
    'Origin': 'https://www.eais.go.kr',
    'Referer': 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/zzazeng30-sudo/dataqjqwjd/main/20260201dong.csv";

// =================================================================
// 유틸리티 함수들 (파싱 로직 유지)
// =================================================================
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function parseReportResponse(rawData) {
    if (typeof rawData !== 'string') return rawData;
    try {
        let clean = rawData.trim().replace(/^\(|\)$/g, '');
        clean = clean.replace(/'/g, '"');
        return JSON.parse(clean);
    } catch (e) { return null; }
}

function deepDecode(obj) {
    if (typeof obj === 'string') {
        if (obj.includes('%')) {
            try { return decodeURIComponent(obj).replace(/\+/g, " "); } catch (e) { return obj; }
        }
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(item => deepDecode(item));
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const key in obj) newObj[key] = deepDecode(obj[key]);
        return newObj;
    }
    return obj;
}

function extractDataPattern(obj, results = []) {
    if (Array.isArray(obj)) {
        if (obj.length >= 2 && obj[0] === "2,0,0,0,0" && Array.isArray(obj[1])) {
            const content = obj[1];
            if (content.length >= 2) {
                const chars = content[0]; 
                const coords = content[1]; 
                if (Array.isArray(chars)) {
                    const textCombined = chars.map(c => c === '+' ? ' ' : c).join('');
                    results.push({ text: textCombined, coordinates: coords });
                }
            }
        }
        for (const item of obj) extractDataPattern(item, results);
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) extractDataPattern(obj[key], results);
    }
    return results;
}

function classifyDataFinal(dataList, targetAddress) {
    const owners = [];
    let current = {};
    const patterns = {
        date: /^\d{4}[.\-\s]+\d{1,2}[.\-\s]+\d{1,2}[.\-\s]*$/,
        resNo: /\d{6}\s*[-~]\s*[1-4*][\d*]{6}/,
        share: /([\d.]+\s*\/\s*[\d.]+)|\d+\s*분의\s*\d+|지분/,
        addressKeywords: ['시', '도', '구', '동', '면', '읍', '리', '로', '길', '아파트', '빌라', '층', '호'],
        reasonKeywords: ['소유권', '이전', '보존', '매매', '증여', '상속', '신탁', '교환', '변경', '등록', '환지', '압류', '가압류', '경매', '명의인', '주소변경'],
        nameStrict: /^[가-힣\s]{2,10}$/
    };
    const isEmpty = (obj) => Object.keys(obj).length === 0;
    const saveAndReset = () => {
        if (!isEmpty(current)) {
            current.name = current.name || '-';
            current.id = current.id || '-';
            current.address = current.address || '-';
            current.share = current.share || '-';
            current.date = current.date || '-';
            current.reason = current.reason || '-';
            if (current.name !== '-' || current.id !== '-' || current.reason !== '-') {
                owners.push(current);
            }
        }
        current = {};
    };

    dataList.forEach((item) => {
        let text = item.text.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/['"]/g, '');
        if (!text || text.includes("이하여백") || text.includes("페이지") || text === '-' || text === '.') return;
        let type = "UNKNOWN";
        if (patterns.resNo.test(text)) type = 'id';
        else if (patterns.date.test(text)) { text = text.replace(/[.\-\s]+$/, ''); type = 'date'; }
        else if (text.includes('/') || patterns.share.test(text)) type = 'share';
        else if (patterns.reasonKeywords.some(k => text.includes(k))) type = 'reason';
        else if (text.length > 5 && patterns.addressKeywords.some(k => text.includes(k))) type = 'address';
        else if (text.endsWith(')') || text.startsWith('(')) type = 'address_part';
        else {
            const isHangul = patterns.nameStrict.test(text.replace(/\s/g, ''));
            const hasNumber = /[0-9]/.test(text); 
            const hasSpecial = /[./\-]/.test(text);
            if (isHangul && !hasNumber && !hasSpecial) type = 'name';
        }
        if (type !== "UNKNOWN") {
            if (type === 'address' || type === 'address_part') {
                if (current['address']) current['address'] += " " + text;
                else if (type === 'address') current['address'] = text;
            } else if (current[type]) {
                saveAndReset();
                current[type] = text;
            } else {
                current[type] = text;
            }
        }
    });
    saveAndReset();
    return owners.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.id === v.id && t.date === v.date)) === i);
}

async function clearCart(client) {
    try {
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const list = r05Res.data?.findPbsvcResveDtls; 
        if (list && list.length > 0) {
            for (const item of list) {
                try { await client.post('/bci/BCIAAA02D01', item); } catch (e) {}
            }
        }
    } catch (e) {}
}

// =================================================================
// 1. VWorld 프록시 (Referer 문제 해결용)
// =================================================================
app.get('/vworld-proxy', async (req, res) => {
    // console.log("📍 [VWorld 요청 도달]");
    try {
        const vworldUrl = `https://api.vworld.kr/req/wfs?${new URLSearchParams(req.query).toString()}`;
        const vworldRes = await axios.get(vworldUrl, {
            headers: { 'Referer': 'http://localhost:5173' }
        });
        res.json(vworldRes.data);
    } catch (e) {
        console.error("❌ VWorld Proxy Error:", e.message);
        if (e.response) res.status(e.response.status).send(e.response.data);
        else res.status(500).json({ success: false, message: e.message });
    }
});

// =================================================================
// 2. 공공데이터포털(건축물대장) 프록시 (고속화: 5초 타임아웃)
// =================================================================
app.get('/gov-data-proxy', async (req, res) => {
    // console.log("📍 [공공데이터 요청 도달]");
    try {
        const { endpoint, ...params } = req.query;
        if (!endpoint) return res.status(400).json({ success: false, message: "endpoint 누락" });

        const baseUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/${endpoint}`;
        
        const response = await axios.get(baseUrl, { 
            params: params,
            timeout: 5000, // ★ 5초 내 응답 없으면 끊음
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        res.json(response.data);

    } catch (e) {
        if (e.code === 'ECONNABORTED' || e.message.includes('timeout')) {
            // console.error(`⏱️ [Timeout] 공공데이터 5초 초과`);
            return res.status(504).json({ success: false, message: "Timeout" });
        }
        console.error("❌ 공공데이터 Proxy Error:", e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

// =================================================================
// 3. 세움터 분석 엔드포인트 (★ 고속화 적용)
// =================================================================
app.post('/scrape', async (req, res) => {
    console.log("\n==================================================");
    console.log("🚀 [세움터 요청] 분석 시작 (고속 모드)");
    console.log("==================================================");

    const { id, pw, address } = req.body;
    if (!id || !pw || !address) return res.status(400).json({ success: false, message: "정보 부족" });

    // HTTP 클라이언트 설정 (쿠키 유지, 타임아웃 10초)
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        baseURL: 'https://www.eais.go.kr',
        jar, withCredentials: true, timeout: 10000,
        headers: BROWSER_HEADERS,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }));

    try {
        // ---------------------------------------------------------
        // 1. 로그인
        // ---------------------------------------------------------
        await client.get('/'); 
        const loginRes = await client.post('/awp/AWPABB01R01', { loginId: id, loginPwd: pw });
        if (loginRes.data?.userNm || loginRes.data?.reMsg === '성공') {
            console.log(`✅ [로그인] ${loginRes.data.userNm || 'User'}`);
        } else {
             // 로그인 실패 시 바로 리턴
             return res.status(401).json({ success: false, message: "로그인 실패" });
        }
        
        // 필수 세션 유지 요청
        await client.get('/cba/CBAAZA02R01'); 
        await clearCart(client);
        
        // ---------------------------------------------------------
        // 2. CSV 매핑 (법정동 코드 찾기)
        // ---------------------------------------------------------
        let lines;
        const csvRes = await axios.get(GITHUB_RAW_URL);
        lines = csvRes.data.split(/\r?\n/);

        const addrParts = address.trim().split(/\s+/);
        const regionKeywords = addrParts.filter(part => isNaN(parseInt(part.replace(/-/g, ""))));
        
        let mapping = null;
        for (let line of lines) {
            const clean = line.replace(/["\r]/g, '').trim();
            if (regionKeywords.every(keyword => clean.includes(keyword))) {
                const cols = clean.split(',');
                mapping = { sigungu: cols[0].substring(0, 5), bjdong: cols[0].substring(5, 10) };
                break;
            }
        }
        if (!mapping) throw new Error("법정동 매핑 실패");

        const bunjiMatch = address.match(/(\d+)(-(\d+))?$/);
        const mnnm = bunjiMatch ? bunjiMatch[1].padStart(4, '0') : "0000";
        const slno = (bunjiMatch && bunjiMatch[3]) ? bunjiMatch[3].padStart(4, '0') : "0000";

        // ---------------------------------------------------------
        // 3. 건축물 검색 (대지 우선)
        // ---------------------------------------------------------
        const platTypes = [{c:"0",n:"대지"}, {c:"1",n:"산"}, {c:"2",n:"블록"}];
        if (address.includes('산')) platTypes.unshift(platTypes.splice(1, 1)[0]);

        let list = null;
        let selectedType = "0";
        for (const type of platTypes) {
            try {
                // console.log(`🔍 [조회 시도] ${type.n}`);
                const sRes = await client.post('/bci/BCIAAA02R01', {
                    addrGbCd: "0", inqireGbCd: "0", bldrgstCurdiGbCd: "0", 
                    platGbCd: type.c, reqSigunguCd: mapping.sigungu, bjdongCd: mapping.bjdong, mnnm: mnnm, slno: slno
                });
                const result = sRes.data?.jibunAddr || sRes.data?.bldrgstList;
                if (result && result.length > 0) {
                    list = result; selectedType = type.c;
                    console.log(`   ✅ 발견: ${list.length}건 (${type.n})`);
                    break;
                }
            } catch (e) {}
        }
        if (!list) throw new Error("건축물 정보 없음");

        const item = list[0]; 
        console.log(`👉 [선택] ${item.bldNm || item.locDetlAddr} (PK: ${item.bldrgstSeqno})`);

        // ---------------------------------------------------------
        // 4. 장바구니 담기 (★ 0.3초 대기)
        // ---------------------------------------------------------
        await client.post('/bci/BCIAAA02C01', { 
            bldrgstSeqno: item.bldrgstSeqno, regstrGbCd: item.regstrGbCd || "1", regstrKindCd: item.regstrKindCd || "2",
            mjrfmlyIssueYn: "N", rntyBrhsIssueYn: "N", bldrgstCurdiGbCd: "0", ownrYn: "N", multiUseBildYn: "N", 
            locPlatGbCd: selectedType, locSigunguCd: mapping.sigungu, locBjdongCd: mapping.bjdong, 
            locDetlAddr: address, locMnnm: mnnm, locSlno: slno, locBldNm: item.bldNm || "", locDongNm: item.dongNm || ""
        });
        
        await sleep(300); // [수정] 1000ms -> 300ms로 단축 (장바구니 반영 최소 시간)

        // 장바구니 확인
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const targetItem = r05Res.data?.findPbsvcResveDtls?.find(i => i.bldrgstSeqno === item.bldrgstSeqno);
        if (!targetItem) throw new Error("장바구니 동기화 실패 (너무 빠름)");

        // ---------------------------------------------------------
        // 5. 발급 신청
        // ---------------------------------------------------------
        await client.post('/bci/BCIAZA02S01', {
            appntInfo: { appntGbCd: "01", appntNm: "신청인" },
            bldrgstGbCd: "1", ownrExprsYn: "N", 
            pbsvcRecpInfo: { pbsvcGbCd: "01", issueReadGbCd: "0", pbsvcResveDtlsCnt: 1 },
            pbsvcResveDtls: [targetItem]
        });

        await client.post('/bci/BCIAAA02D02', { lastUpdusrId: id });
        await client.get('/cba/CBAAZA02R01');
        await client.post('/awp/AWPABB01R20', {});

        // ---------------------------------------------------------
        // 6. 문서 생성 대기 (★ 가변 폴링 적용)
        // ---------------------------------------------------------
        console.log(`⏳ [대기] 문서 생성 중...`);
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let successItem = null;
        
        // 최대 15회 시도
        for (let i = 0; i < 15; i++) { 
            // 첫 번째는 1초, 그 다음부터는 1.5초 대기 (기존 3초 대비 절반 이상 단축)
            const waitTime = (i === 0) ? 1000 : 1500;
            await sleep(waitTime);

            const reportRes = await client.post('/bci/BCIAAA06R01', { firstSaveEndDate: today, firstSaveStartDate: today, recordSize: 10, progStateFlagArr: ["01"] });
            successItem = reportRes.data?.IssueReadHistList?.[0]; 
            
            // 발급완료(03) 혹은 완료 텍스트가 있으면 성공
            if (successItem && (successItem.issuStsCd === '03' || (successItem.issuStsCdNm && successItem.issuStsCdNm.includes('완료')))) {
                 break;
            }
        }
        if (!successItem) throw new Error("문서 생성 시간 초과");

        // ---------------------------------------------------------
        // 7. 리포트 다운로드 및 파싱 (기존 로직 유지)
        // ---------------------------------------------------------
        const recpNo = successItem.pbsvcRecpNo;
        const dRes = await client.post('/bci/BCIAAA06R03', { issueReadAppDate: today, pbsvcRecpNo: recpNo });
        const fileId = dRes.data.count?.FILE_ID;
        const y = today.substring(0,4), m = today.substring(4,6), d = today.substring(6,8);
        const xmlPath = `/cais_data/issue/${y}/${m}/${d}/${recpNo}/${recpNo}.xml`;
        const oof = `<?xml version='1.0' encoding='utf-8'?><oof version='3.0'><document title='' enable-thread='0'><file-list><file type='crf.root' path='%root%/crf/bci/djrBldrgstGnrl.crf'></file></file-list><connection-list><connection type='file' namespace='XML1'><config-param-list><config-param name='path'>${xmlPath}</config-param></config-param-list><content content-type='xml' namespace='*'><content-param name='encoding'>euc-kr</content-param><content-param name='root'>{%dataset.xml.root%}</content-param></content></connection></connection-list><field-list type="name"><field name='FILE_ID'>${fileId}</field><field name='SVR_HOST'>156.177:7000</field></field-list></document></oof>`;

        const r1 = await client.post('/report/RPTCAA02R02', `ClipID=R01&oof=${encodeURIComponent(oof)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const uid = parseReportResponse(r1.data)?.uid;
        if (!uid) throw new Error("리포트 UID 획득 실패");

        const r2Params = `uid=${uid}&clipUID=${uid}&ClipType=DocumentPageView&ClipData=${encodeURIComponent(JSON.stringify({"reportkey":uid,"isMakeDocument":true,"pageMethod":0}))}`;
        const r2 = await client.post('/report/RPTCAA02R02', r2Params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const r2Json = parseReportResponse(r2.data);
        
        if (!r2Json || !r2Json.resValue || !r2Json.resValue.viewData) throw new Error("리포트 데이터 없음");

        const viewData = r2Json.resValue.viewData.replace(/\s/g, "");
        const decodedString = Buffer.from(viewData, 'base64').toString('utf-8');
        const dataObj = JSON.parse(decodedString);
        const decodedResult = deepDecode(dataObj);
        
        const fullList = extractDataPattern(decodedResult);
        const targetKeyword = "건축물 현황";
        const splitIndex = fullList.findIndex(item => item.text.includes(targetKeyword));
        const finalRawData = splitIndex === -1 ? fullList : fullList.slice(0, splitIndex);

        const ownerList = classifyDataFinal(finalRawData, address);
        console.log(`✅ [완료] 추출: ${ownerList.length}명`);
        res.json({ success: true, data: ownerList });

    } catch (e) {
        console.error(`❌ 오류: ${e.message}`);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (client) await clearCart(client);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});