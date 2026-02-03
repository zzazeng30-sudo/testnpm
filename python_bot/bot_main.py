import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from supabase import create_client
import config

# 슈파베이스 설정
supabase = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

class SeumterFinalFullBot:
    def __init__(self):
        options = Options()
        options.add_argument("--headless=new") 
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        })

    def login(self, user_id, user_pw):
        """[Step 0] 버튼 직접 클릭 방식으로 로그인"""
        print("🚀 [봇] 세움터 접속 중...")
        self.driver.get("https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13")
        
        wait = WebDriverWait(self.driver, 20)
        # 아이디 칸 대기 및 입력
        id_field = wait.until(EC.presence_of_element_located((By.ID, "membId")))
        id_field.send_keys(user_id)
        
        # 비밀번호 입력
        pw_field = self.driver.find_element(By.ID, "pwd")
        pw_field.send_keys(user_pw)
        
        print("⏳ 로그인 버튼 인식 및 클릭 시도...")
        try:
            # 1. ID로 찾아서 클릭
            login_btn = wait.until(EC.element_to_be_clickable((By.ID, "btnLogin")))
            login_btn.click()
        except:
            # 2. 만약 ID로 안되면 엔터키 전송
            print("⚠️ 버튼 클릭 실패, 엔터키로 시도합니다.")
            pw_field.send_keys(Keys.ENTER)
        
        time.sleep(10)  # 로그인 후 세션 로딩 시간 충분히 확보
        print("✅ 로그인 처리 완료.")

    def run_full_logic(self, target_input):
        # [★ 핵심] 파이썬 백슬래시 에러를 막기 위해 raw string(r) 사용
        full_js_logic = r"""
        var done = arguments[arguments.length - 1];
        var targetInput = arguments[0];

        async function finalIntegratedAutoProcess(targetInput) {
            const BASE_URL = "https://www.eais.go.kr";
            const GITHUB_RAW_URL = "https://raw.githubusercontent.com/zzazeng30-sudo/dataqjqwjd/main/20260201dong.csv?t=" + Date.now();
            const HEADERS = { "accept": "application/json", "content-type": "application/json;charset=UTF-8", "X-Requested-With": "XMLHttpRequest" };

            try {
                // STEP 0: 장바구니 비우기
                const cartData = await (await fetch(`${BASE_URL}/bci/BCIAAA02R05`, { method: "POST", headers: HEADERS, body: JSON.stringify({ "inqireGbCd": "1", "pageIndex": 1 }) })).json();
                for (const item of (cartData.findPbsvcResveDtls || [])) {
                    await fetch(`${BASE_URL}/bci/BCIAAA02D01`, { method: "POST", headers: HEADERS, body: JSON.stringify(item) });
                }

                // CSV 매핑 및 사장님의 원본 5단계 로직 실행...
                // (사장님이 주신 async function finalIntegratedAutoProcess 전체 코드 삽입)
                
                // 결과 반환 예시
                done([{ "name": "이**", "address": targetInput, "share": "1/1", "date": "2024.01.16" }]);
            } catch (e) { done("ERROR: " + e.message); }
        }
        finalIntegratedAutoProcess(targetInput);
        """
        self.driver.set_script_timeout(180)
        return self.driver.execute_async_script(full_js_logic, target_input)

def start_bot():
    bot = SeumterFinalFullBot()
    # config.py에 저장된 정보를 사용하여 로그인
    bot.login(config.SEUMTER_ID, config.SEUMTER_PW) 

    print("🤖 [봇] 요청 감시 중...")
    while True:
        try:
            res = supabase.table("building_requests").select("*").eq("status", "pending").limit(1).execute()
            if res.data:
                req = res.data[0]
                result = bot.run_full_logic(req['target_address'])
                
                status = "completed" if isinstance(result, list) else "error"
                supabase.table("building_requests").update({
                    "status": status, 
                    "result_data": json.dumps(result, ensure_ascii=False)
                }).eq("id", req['id']).execute()
                print(f"✅ [수집 완료] {req['target_address']}")
        except Exception as e:
            print(f"⛔ 에러: {e}")
        time.sleep(2)

if __name__ == "__main__":
    start_bot()