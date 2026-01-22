const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

async function finalSeumterLoginVerification() {
    console.log("🚀 [세움터] 로그인 세션 상세 검증 시작...");

    // 1. 클린 세션을 위한 쿠키 저장소 생성
    const jar = new CookieJar();
    
    // 2. Axios 인스턴스 설정 (CookieJar 지원)
    const client = wrapper(axios.create({
        baseURL: 'https://www.eais.go.kr',
        jar,
        withCredentials: true,
        timeout: 15000,
        maxRedirects: 10,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive'
        }
    }));

    try {
        // [Step 1] 초기 접속 (보안 쿠키 획득)
        console.log("\n1️⃣ 단계: 초기 보안 세션 확보 중...");
        await client.get('/');

        // [Step 2] 로그인 시도
        console.log("2️⃣ 단계: 로그인 API 호출 (AWPABB01R01)...");
        const loginPayload = {
            loginId: "zzazeng10",
            loginPwd: "Dlxogh12!"
        };

        const loginRes = await client.post('/awp/AWPABB01R01', loginPayload, {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Referer': 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13',
                'X-Requested-With': 'XMLHttpRequest',
                'untclsfcd': '1000'
            }
        });

        // [Step 3] 상세 결과 분석 및 출력
        console.log("\n=========================================");
        if (loginRes.data.sessionRep) {
            const user = loginRes.data.sessionRep;
            console.log("✅ 세움터 로그인 인증 성공 데이터 분석");
            console.log(`-----------------------------------------`);
            console.log(`👤 사용자 성함    : ${user.sessionUserNm}`);
            console.log(`🆔 회원 고유번호  : ${user.membNo}`);
            console.log(`📅 마지막 로그인  : ${user.lastLoginDtime}`);
            console.log(`🌐 마지막 접속 IP : ${user.lastLoginIp}`);
            console.log(`🔑 사용자 구분    : ${user.userType} (01: 일반민원인)`);
            console.log(`📱 접속 채널      : ${user.connectType} (W: Web)`);
            console.log(`-----------------------------------------`);

            // 현재 메모리에 저장된 핵심 보안 쿠키 출력
            const currentCookies = await jar.getCookies('https://www.eais.go.kr');
            console.log("🍪 현재 활성화된 보안 통행증(Cookies):");
            currentCookies.forEach(cookie => {
                // 보안상 값의 일부만 출력
                const maskedValue = cookie.value.length > 20 
                    ? cookie.value.substring(0, 15) + "..." 
                    : cookie.value;
                console.log(`   - [${cookie.key}]: ${maskedValue}`);
            });
            console.log("=========================================");
            console.log("💡 위 쿠키들이 유지되는 동안은 추가 로그인 없이 데이터를 뽑을 수 있습니다.");
        } else {
            console.log("⚠️ 로그인 응답 형식이 평소와 다릅니다.");
            console.log("응답 원본:", JSON.stringify(loginRes.data, null, 2));
        }

    } catch (error) {
        console.error("\n❌ 프로세스 오류 발생:", error.message);
        if (error.response) {
            console.error("응답 상태 코드:", error.response.status);
            console.error("서버 에러 메시지:", error.response.data);
        }
    }
}

finalSeumterLoginVerification();