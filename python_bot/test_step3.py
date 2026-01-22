import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options

# ▼▼▼ [설정] 찾고 싶은 주소 ▼▼▼
# 동 이름과 번지를 분리해서 적어주세요
TARGET_DONG = "권곡동"
TARGET_NUM = "409-87" 

def run_api_bot():
    print(f"🚀 [API 봇] 번지수({TARGET_NUM}) 우선 검색 모드...\n")

    # 1. 크롬 연결 (쿠키 확보)
    chrome_options = Options()
    chrome_options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    
    try:
        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    except:
        print("❌ 크롬이 디버그 모드로 실행되지 않았습니다!")
        return

    print("👉 1. 통행증(Cookie) 복사 중...")
    session = requests.Session()
    headers = {
        "User-Agent": driver.execute_script("return navigator.userAgent;"),
        "Content-Type": "application/json",
        "Referer": "https://www.eais.go.kr/",
        "Origin": "https://www.eais.go.kr"
    }
    for cookie in driver.get_cookies():
        session.cookies.set(cookie['name'], cookie['value'])
    print("   ✅ 완료!")

    # =========================================================
    # 2단계: '번지'로 넓게 검색하고, '동'으로 골라내기
    # =========================================================
    print(f"\n👉 2. 서버에 '{TARGET_NUM}'(번지) 포함된 건물 요청...")
    
    search_url = "https://search.eais.go.kr/bldrgsttitle/_search"
    
    # 전략: 주소 텍스트 매칭이 까다로우니, 'query_string'으로 와일드카드 검색
    # *409-87* 이렇게 검색하면 앞뒤에 뭐가 붙든 다 찾아냅니다.
    search_payload = {
        "query": {
            "query_string": {
                "query": f"*{TARGET_NUM}*",     # 예: *409-87*
                "fields": ["jibunAddr", "roadAddr"], 
                "default_operator": "AND"
            }
        },
        "size": 50  # 넉넉하게 50개 가져와서 뒤짐
    }

    try:
        res = session.post(search_url, headers=headers, json=search_payload)
        
        if res.status_code != 200:
            print(f"❌ 검색 통신 실패 (코드: {res.status_code})")
            return

        data = res.json()
        hits = data.get('hits', {}).get('hits', [])

        if not hits:
            print(f"⚠️ '{TARGET_NUM}'(으)로 검색된 결과가 0건입니다.")
            return

        print(f"   🔎 {len(hits)}개의 후보를 찾았습니다. '{TARGET_DONG}' 찾는 중...")

        # 봇이 직접 하나씩 검사 (Python 필터링)
        found_target = None
        for hit in hits:
            source = hit['_source']
            addr_jibun = source.get('jibunAddr', '')
            addr_road = source.get('roadAddr', '')
            
            # 주소에 '권곡동'이 포함되어 있는지 확인
            if TARGET_DONG in addr_jibun or TARGET_DONG in addr_road:
                found_target = source
                print(f"      👉 발견! [{addr_jibun}]")
                break
        
        if not found_target:
            print(f"   ⚠️ {len(hits)}개 중에 '{TARGET_DONG}'이 포함된 주소가 없습니다.")
            print("      (검색된 목록 예시:", hits[0]['_source'].get('jibunAddr'), ")")
            return

        # ID 추출
        bld_pk = found_target.get('mgmUpperBldrgstPk') 
        print(f"\n🎉 [최종 확인] 목표 건물을 확보했습니다!")
        print(f"   🔑 고유번호(PK): {bld_pk}") 

    except Exception as e:
        print(f"⛔ 에러: {e}")
        return

    # =========================================================
    # 3단계: 찾은 ID로 '민원 담기'
    # =========================================================
    print("\n👉 3. '민원 담기' 시도...")
    
    cart_url = "https://www.eais.go.kr/bci/BCIAAA02R01" 
    
    cart_payload = {
        "addrGbCd": "2",  
        "bldrgstCurdiGbCd": "0",
        "bldrgstSeqno": bld_pk,     # ID 자동 입력
        "inqireGbCd": "0",
        "untClsfCd": "1173",        # 일반건축물
        "bjdongCd": "", "bldMnnm": "", "bldSlno": "", "reqSigunguCd": "", 
        "sigunguCd": "", "slno": ""
    }

    try:
        cart_res = session.post(cart_url, headers=headers, json=cart_payload)
        
        if cart_res.status_code == 200:
            print("   🚀 [전송 성공] 서버 응답 완료.")
            print("   📄 확인: 브라우저 장바구니에 담겼는지 보세요!")
        else:
            print(f"   ❌ 담기 실패 ({cart_res.status_code})")

    except Exception as e:
        print(f"   ⛔ 담기 중 에러: {e}")

if __name__ == "__main__":
    run_api_bot()