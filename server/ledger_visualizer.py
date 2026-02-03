import json
import os
import webbrowser

def generate_visual_dashboard():
    base_path = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_path, "result1.json")
    html_path = os.path.join(base_path, "ledger_visual_map.html")

    if not os.path.exists(json_path):
        return print(f"❌ 오류: '{json_path}' 파일이 없습니다.")

    try:
        with open(json_path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        final_pages = []

        # 1. JSON 계층 구조 탐색
        for page_idx, page in enumerate(data.get("pageList", [])):
            page_data = {"index": page_idx, "sections": []}
            
            for section in page.get("d", []):
                # Level 3 섹션 기준 좌표 (Base Y 추출)
                raw_a = section.get("a", "0,0,0,0,0,0,0")
                coords_split = raw_a.split(',')
                base_y = int(coords_split[2]) if len(coords_split) > 2 else 0
                
                section_items = []
                # 좌표 상태를 추적하기 위한 가변 객체 (SyntaxError 해결)
                coord_state = {"current_rel_y": 0}
                
                def extract_items(obj):
                    if isinstance(obj, list):
                        # 상대 좌표 업데이트 (6개 숫자 패턴 감지)
                        if len(obj) >= 6 and all(isinstance(x, (int, float)) for x in obj[:5]):
                            coord_state["current_rel_y"] = int(obj[2])

                        # 실제 데이터 패턴 ["2,0,0,0,0", [글자들]]
                        if len(obj) >= 2 and obj[0] == "2,0,0,0,0" and isinstance(obj[1], list):
                            content = obj[1]
                            if len(content) >= 2:
                                chars = content[0]
                                coords = content[1]
                                text = "".join([c if c != "+" else " " for c in chars]).strip()
                                if text:
                                    section_items.append({
                                        "text": text,
                                        "x": coords[0] if coords else 0,
                                        "abs_y": base_y + coord_state["current_rel_y"] # 절대 Y 좌표
                                    })
                        for item in obj: extract_items(item)
                    elif isinstance(obj, dict):
                        for v in obj.values(): extract_items(v)

                extract_items(section)

                if section_items:
                    # 섹션 명칭 부여 로직
                    full_txt = " ".join([i['text'] for i in section_items])
                    s_name = "순차적 정보 그룹"
                    if any(k in full_txt for k in ["변옥순", "민중태", "민경아"]): s_name = "소유자 단위 그룹"
                    elif "건축물 현황" in full_txt: s_name = "건물 현황 그룹"

                    page_data["sections"].append({
                        "name": s_name,
                        "base_y": base_y,
                        "items": section_items
                    })
            
            final_pages.append(page_data)

        # 2. HTML 템플릿 생성
        html_content = """
        <!DOCTYPE html>
        <html lang="ko"><head><meta charset="UTF-8">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .item-box { border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; padding: 10px; min-width: 130px; }
            .owner-highlight { border-left: 4px solid #ef4444; background: #fff1f2; }
            .building-highlight { border-left: 4px solid #3b82f6; background: #eff6ff; }
        </style></head>
        <body class="bg-slate-50 p-8">
            <div class="max-w-6xl mx-auto space-y-10">
                <h1 class="text-3xl font-black text-slate-800 text-center">📋 건축물대장 절대 좌표 시각화</h1>
        """

        for page in final_pages:
            for section in page["sections"]:
                html_content += f"""
                <div class="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                    <div class="bg-slate-800 text-white px-6 py-2 flex justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span>{section['name']}</span>
                        <span>SECTION BASE Y: {section['base_y']}</span>
                    </div>
                    <div class="p-6 flex flex-wrap gap-4">
                """
                for item in section["items"]:
                    # X좌표와 Y좌표에 따른 스타일 구분
                    is_owner = item['x'] > 100
                    h_class = "owner-highlight" if is_owner else "building-highlight"
                    
                    html_content += f"""
                    <div class="item-box {h_class}">
                        <div class="text-[9px] font-mono text-slate-400 mb-1">
                            X: {item['x']} | Y: {item['abs_y']}
                        </div>
                        <div class="text-sm font-bold text-slate-800">{item['text']}</div>
                    </div>
                    """
                html_content += "</div></div>"

        html_content += "</div></body></html>"

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"✅ 대시보드가 성공적으로 생성되었습니다: {html_path}")
        webbrowser.open('file://' + os.path.realpath(html_path))

    except Exception as e:
        print(f"❌ 실행 중 오류 발생: {e}")

if __name__ == "__main__":
    generate_visual_dashboard()