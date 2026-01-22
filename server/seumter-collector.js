const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const fs = require('fs');

// [설정 정보]
const USER_ID = 'zzazeng10';
const USER_PWD = 'Dlxogh12!';
const TARGET_INPUT = '충청남도 아산시 권곡동 533-3'; 
const GITHUB_RAW_URL = "https://raw.githubusercontent.com/zzazeng30-sudo/dataqjqwjd/main/20260201dong.csv";

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function parseReportResponse(rawData) {
    if (typeof rawData !== 'string') return rawData;
    let clean = rawData.trim().replace(/^\(|\)$/g, '');
    clean = clean.replace(/'/g, '"');
    return JSON.parse(clean);
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

function classifyData(dataList) {
    const result = { A: [], B: [], C: [], D: [] };
    const dateRegex = /^\d{4}[\.-]\d{2}[\.-]\d{2}\.?$/; 
    const resNoRegex = /^\d{6}-[*0-9]{7}$/; 
    const shareRegex = /(\d+(\.\d+)?)\/(\d+(\.\d+)?)|지분|소유권/;
    const addressKeywords = ['시', '도', '구', '동', '면', '읍', '리', '로', '길', '아파트', '빌라', '호', '층'];
    const reasonKeywords = ['매매', '보존', '이전', '변경', '상속', '증여', '교환', '신탁', '분할'];

    dataList.forEach(item => {
        const text = item.text.trim();
        if (text.includes("이하여백") || text.includes("페이지")) return;

        if (resNoRegex.test(text)) {
            result.A.push({ type: '주민번호', value: text });
        } else if (dateRegex.test(text)) {
            result.D.push({ type: '변동일', value: text });
        } else if (shareRegex.test(text) && text.length < 10) {
            result.C.push(text);
        } else if (reasonKeywords.some(k => text.includes(k))) {
            result.D.push({ type: '변동원인', value: text });
        } else if (addressKeywords.some(k => text.includes(k)) && text.length > 5) {
            result.B.push(text);
        } else {
            if (text.length > 0) {
                if (text.startsWith('(') || text.endsWith(')') || text.match(/^\d+동/)) {
                    result.B.push(text);
                } else {
                    result.A.push({ type: '이름', value: text });
                }
            }
        }
    });

    if (result.B.length > 0) result.B = [result.B.join(' ')];
    return result;
}

/**
 * [NEW] 장바구니 비우기 함수 (보내주신 로직 반영)
 * - R05로 목록 조회 -> 반복문으로 D01 호출하여 개별 삭제
 */
async function clearCart(client) {
    try {
        console.log("🧹 [장바구니 청소] 기존 내역 확인 중...");
        
        // 1. 목록 조회 (R05)
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const list = r05Res.data?.findPbsvcResveDtls; 

        if (list && list.length > 0) {
            console.log(`🗑️ 총 ${list.length}개의 항목을 발견하여 삭제합니다.`);
            
            // 2. 반복문으로 개별 삭제 (D01)
            for (const item of list) {
                try {
                    // 보내주신 코드의 로직: D01에 item 객체를 그대로 전송
                    await client.post('/bci/BCIAAA02D01', item);
                } catch (delErr) {
                    console.log(`⚠️ 삭제 실패 (Seq: ${item.bldrgstSeqno}): ${delErr.message}`);
                }
            }
            console.log("✨ 장바구니 비우기 완료.");
        } else {
            console.log("✨ 장바구니가 이미 비어있습니다.");
        }
    } catch (e) {
        console.log(`⚠️ 장바구니 청소 중 오류 (무시 가능): ${e.message}`);
    }
}

async function runIntegratedProcess(targetInput) {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        baseURL: 'https://www.eais.go.kr',
        jar,
        withCredentials: true,
        timeout: 60000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'untclsfcd': '1000',
            'Origin': 'https://www.eais.go.kr',
            'Content-Type': 'application/json; charset=UTF-8'
        }
    }));

    try {
        console.clear();
        console.log(`🚀 [작업 시작] 대상: ${targetInput}`);

        // [STEP 1] 로그인
        await client.get('/');
        await client.post('/awp/AWPABB01R01', { loginId: USER_ID, loginPwd: USER_PWD }, { headers: { 'Referer': 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13' } });
        await client.get('/cba/CBAAZA02R01');

        // [청소] 시작 전 장바구니 비우기
        await clearCart(client);

        // [STEP 2] 주소 매핑 및 검색
        const csvRes = await axios.get(GITHUB_RAW_URL);
        const lines = csvRes.data.split(/\r?\n/);
        const addrParts = targetInput.trim().split(/\s+/);
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
        if (!mapping) throw new Error("지역 코드 매핑 실패");
        const bunjiMatch = targetInput.match(/(\d+)(-(\d+))?$/);
        const mnnm = bunjiMatch ? bunjiMatch[1].padStart(4, '0') : "0000";
        const slno = (bunjiMatch && bunjiMatch[3]) ? bunjiMatch[3].padStart(4, '0') : "0000";
        
        const sRes = await client.post('/bci/BCIAAA02R01', {
            addrGbCd: "0", inqireGbCd: "0", bldrgstCurdiGbCd: "0", platGbCd: "0",
            reqSigunguCd: mapping.sigungu, bjdongCd: mapping.bjdong, mnnm: mnnm, slno: slno
        });
        const item = sRes.data?.jibunAddr?.[0] || sRes.data?.bldrgstList?.[0];

        // [STEP 3] 장바구니 담기
        await client.post('/bci/BCIAAA02C01', { 
            bldrgstSeqno: item.bldrgstSeqno, regstrGbCd: item.regstrGbCd || "1", regstrKindCd: item.regstrKindCd || "2",
            mjrfmlyIssueYn: "N", rntyBrhsIssueYn: "N", bldrgstCurdiGbCd: "0", ownrYn: "N", multiUseBildYn: "N",
            locPlatGbCd: "0", locSigunguCd: mapping.sigungu, locBjdongCd: mapping.bjdong, 
            locDetlAddr: targetInput, locMnnm: mnnm, locSlno: slno,
            locBldNm: item.bldNm || "", locDongNm: item.dongNm || "주건축물제1동"
        });

        // [STEP 4] 민원 신청
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const targetItem = r05Res.data?.findPbsvcResveDtls?.find(i => i.bldrgstSeqno === item.bldrgstSeqno);
        await client.post('/bci/BCIAZA02S01', {
            appntInfo: { appntGbCd: "01", appntJmno1: "930518", appntNm: "민원인", appntMtelno: "010-4404-5180" },
            bldrgstGbCd: "1", ownrExprsYn: "N", 
            pbsvcRecpInfo: { pbsvcGbCd: "01", issueReadGbCd: "0", pbsvcResveDtlsCnt: 1 },
            pbsvcResveDtls: [targetItem]
        });

        await client.post('/bci/BCIAAA02D02', { lastUpdusrId: USER_ID });
        await client.get('/cba/CBAAZA02R01');
        await client.post('/awp/AWPABB01R20', {});

        // [STEP 5-6] 접수번호 및 XML 경로 확보 (대기)
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let successItem = null;
        for (let i = 0; i < 5; i++) {
            await sleep(3000);
            const reportRes = await client.post('/bci/BCIAAA06R01', { firstSaveEndDate: today, firstSaveStartDate: today, recordSize: 10, progStateFlagArr: ["01"] });
            successItem = reportRes.data?.IssueReadHistList?.[0];
            if (successItem) break;
        }
        const recpNo = successItem.pbsvcRecpNo;
        const dRes = await client.post('/bci/BCIAAA06R03', { issueReadAppDate: today, pbsvcRecpNo: recpNo });
        const fileId = dRes.data.count?.FILE_ID;
        const y = today.substring(0,4), m = today.substring(4,6), d = today.substring(6,8);
        const xmlPath = `/cais_data/issue/${y}/${m}/${d}/${recpNo}/${recpNo}.xml`;
        const oof = `<?xml version='1.0' encoding='utf-8'?><oof version='3.0'><document title='' enable-thread='0'><file-list><file type='crf.root' path='%root%/crf/bci/djrBldrgstGnrl.crf'></file></file-list><connection-list><connection type='file' namespace='XML1'><config-param-list><config-param name='path'>${xmlPath}</config-param></config-param-list><content content-type='xml' namespace='*'><content-param name='encoding'>euc-kr</content-param><content-param name='root'>{%dataset.xml.root%}</content-param></content></connection></connection-list><field-list type="name"><field name='FILE_ID'>${fileId}</field><field name='SVR_HOST'>156.177:7000</field></field-list></document></oof>`;

        // [STEP 7] 리포트 데이터 요청 및 처리
        const r1 = await client.post('/report/RPTCAA02R02', `ClipID=R01&oof=${encodeURIComponent(oof)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const uid = parseReportResponse(r1.data).uid;
        const r2Params = `uid=${uid}&clipUID=${uid}&ClipType=DocumentPageView&ClipData=${encodeURIComponent(JSON.stringify({"reportkey":uid,"isMakeDocument":true,"pageMethod":0}))}`;
        const r2 = await client.post('/report/RPTCAA02R02', r2Params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });

        console.log("\n==================================================");
        console.log("💾 [데이터 처리] 분류 및 저장 중...");
        console.log("==================================================");

        const r2Json = parseReportResponse(r2.data);
        const viewData = r2Json.resValue.viewData.replace(/\s/g, "");
        const decodedString = Buffer.from(viewData, 'base64').toString('utf-8');
        const dataObj = JSON.parse(decodedString);
        
        const decodedResult = deepDecode(dataObj);
        const fullList = extractDataPattern(decodedResult);
        const targetKeyword = "건축물 현황";
        const splitIndex = fullList.findIndex(item => item.text.includes(targetKeyword));
        const finalRawData = splitIndex === -1 ? fullList : fullList.slice(0, splitIndex);
        const groupedData = classifyData(finalRawData);

        fs.writeFileSync('extracted_data.json', JSON.stringify(groupedData, null, 2), 'utf-8');
        
        console.log("\n👇 [그룹핑 결과] 👇");
        console.table(groupedData.A);
        console.log(groupedData.B);
        console.log(groupedData.C.length > 0 ? groupedData.C : "(소유권지분 없음)");
        console.table(groupedData.D);

    } catch (e) {
        console.error('❌ 에러 발생:', e.message);
    } finally {
        // [청소] 종료 시에도 무조건 장바구니 비우기
        if (client) {
            console.log("\n🏁 [종료] 뒷정리 중...");
            await clearCart(client);
        }
    }
}

runIntegratedProcess(TARGET_INPUT);