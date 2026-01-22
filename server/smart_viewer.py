import json
import os
import re
import webbrowser

def generate_smart_dashboard():
    # 1. 파일 읽기
    base_path = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_path, "extracted_data.json")
    html_path = os.path.join(base_path, "smart_dashboard.html")

    if not os.path.exists(json_path):
        return print(f"❌ 오류: '{json_path}' 파일을 찾을 수 없습니다.")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 2. 지능형 분류를 위한 정규식 및 키워드
    RE_RESIDENT_NO = re.compile(r'\d{6}-\d{1}\*+') # 주민번호 패턴 (XXXXXX-X******)
    RE_DATE = re.compile(r'\d{4}\.\d{1,2}\.\d{1,2}') # 날짜 패턴 (2021.10.18.)
    
    KEY_BUILDING = ["건물ID", "고유번호", "명칭", "대지위치", "지번", "도로명주소"]
    KEY_SPECS = ["면적", "구조", "용도", "층", "건폐율", "용적률", "높이", "지붕", "㎡", "%"]

    # 3. 데이터 그룹화 엔진
    final_groups = []
    current_items = []

    for entry in data:
        text = entry['text'].strip()
        if not text: continue

        # 카테고리 자동 판별
        category = "etc"
        if any(k in text for k in KEY_BUILDING):
            category = "Category_A" # 파랑: 건물 식별
        elif any(k in text for k in KEY_SPECS) or text in ["㎡", "%", "m"]:
            category = "Category_B" # 초록: 물리적 제원
        elif RE_RESIDENT_NO.search(text) or RE_DATE.search(text) or len(text) <= 4:
            category = "Category_C" # 빨강: 소유자/인적 정보
            
        item = {"text": text, "cat": category, "coords": entry['coordinates']}
        
        # [그룹 나누기 로직]
        # 건물 식별 키워드가 새로 시작되면 이전 그룹 마감 (새로운 영역 시작)
        if any(k in text for k in ["건물ID", "대지위치"]) and current_items:
            final_groups.append({"name": "건물 기본 정보 섹션", "items": current_items})
            current_items = []
        
        current_items.append(item)

        # 주민번호가 나오면 "소유자 한 명의 정보"가 끝난 것으로 판단하여 그룹 마감
        if RE_RESIDENT_NO.search(text):
            final_groups.append({"name": "소유자 단위 정보", "items": current_items})
            current_items = []
        
        # '이하여백'이 나오면 섹션 마감
        elif "- 이하여백 -" in text:
            final_groups.append({"name": "문서 마감 섹션", "items": current_items})
            current_items = []

    # 남은 아이템 처리
    if current_items:
        final_groups.append({"name": "추가 데이터 섹션", "items": current_items})

    # 4. HTML 생성
    html_content = """
    <!DOCTYPE html>
    <html lang="ko"><head><meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .Category_A { background-color: #eff6ff; border-color: #3b82f6; color: #1e40af; } /* 파랑: 식별 */
        .Category_B { background-color: #f0fdf4; border-color: #22c55e; color: #166534; } /* 초록: 제원 */
        .Category_C { background-color: #fef2f2; border-color: #ef4444; color: #991b1b; } /* 빨강: 소유자 */
        .etc { background-color: #f8fafc; border-color: #cbd5e1; color: #475569; }
    </style></head>
    <body class="bg-slate-100 p-8">
        <div class="max-w-4xl mx-auto">
            <header class="mb-10 text-center">
                <h1 class="text-3xl font-black text-slate-800">📋 건축물대장 자동 그룹화 뷰어</h1>
                <p class="text-slate-500">extracted_data.json의 순서와 패턴을 분석하여 자동 생성됨</p>
            </header>
            <div class="space-y-8">
    """

    for group in final_groups:
        html_content += f"""
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="bg-slate-50 px-4 py-2 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group['name']}</div>
            <div class="p-5 flex flex-wrap gap-3">
        """
        for item in group['items']:
            html_content += f"""
            <div class="{item['cat']} px-4 py-2 rounded-lg border-2 shadow-sm">
                <span class="block text-[9px] opacity-50 mb-1 font-mono">Start X: {item['coords'][0]}</span>
                <span class="text-sm font-bold">{item['text']}</span>
            </div>
            """
        html_content += "</div></div>"

    html_content += "</div></div></body></html>"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"✅ 분석 및 시각화 완료! '{html_path}' 파일을 확인하세요.")
    webbrowser.open('file://' + os.path.realpath(html_path))

if __name__ == "__main__":
    generate_smart_dashboard()