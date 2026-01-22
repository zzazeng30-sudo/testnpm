import json
import os
import webbrowser

def generate_hierarchy_dashboard():
    base_path = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_path, "result1.json")
    html_path = os.path.join(base_path, "ledger_hierarchy_map.html")

    if not os.path.exists(json_path):
        return print(f"❌ 오류: '{json_path}' 파일이 없습니다.")

    with open(json_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    # 1. 계층 데이터 추출 로직
    pages = []
    for p_idx, page in enumerate(data.get("pageList", [])):
        current_page = {"id": p_idx, "sections": []}
        
        # LEVEL 3: 'd' 리스트 (섹션 단위)
        for s_idx, section in enumerate(page.get("d", [])):
            s_coords = section.get("a", "0,0,0,0,0,0,0").split(',')
            base_y = int(s_coords[2]) if len(s_coords) > 2 else 0
            
            current_section = {
                "id": s_idx,
                "base_y": base_y,
                "raw_coords": section.get("a"),
                "items": []
            }
            
            # LEVEL 4: 섹션 내부 아이템 탐색
            state = {"rel_y": 0, "rel_coords": ""}
            
            def find_lv4(obj):
                if isinstance(obj, list):
                    # 상대 좌표 박스 감지 (레벨 4의 기준틀)
                    if len(obj) >= 6 and all(isinstance(x, (int, float)) for x in obj[:5]):
                        state["rel_y"] = int(obj[2])
                        state["rel_coords"] = f"{obj[1]},{obj[2]},{obj[3]},{obj[4]}"

                    # 실제 텍스트 블록 감지
                    if len(obj) >= 2 and obj[0] == "2,0,0,0,0" and isinstance(obj[1], list):
                        content = obj[1]
                        if len(content) >= 2:
                            text = "".join([c if c != "+" else " " for c in content[0]]).strip()
                            if text:
                                current_section["items"].append({
                                    "text": text,
                                    "start_x": content[1][0] if content[1] else 0,
                                    "abs_y": base_y + state["rel_y"],
                                    "rel_box": state["rel_coords"]
                                })
                    for item in obj: find_lv4(item)
                elif isinstance(obj, dict):
                    for v in obj.values(): find_lv4(v)

            find_lv4(section)
            if current_section["items"]:
                pages.append(current_page)
                current_page["sections"].append(current_section)

    # 2. HTML 템플릿 생성 (계층 구조 강조 디자인)
    html_start = """
    <!DOCTYPE html>
    <html lang="ko"><head><meta charset="UTF-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .lv2-page { background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 20px; padding: 30px; margin-bottom: 50px; }
        .lv3-section { background: #ffffff; border: 1px solid #94a3b8; border-radius: 12px; padding: 20px; margin-bottom: 25px; position: relative; }
        .lv3-header { position: absolute; top: -12px; left: 20px; background: #475569; color: white; padding: 2px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .lv4-item { background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px; display: inline-block; margin: 4px; vertical-align: top; }
    </style></head>
    <body class="bg-slate-200 p-12 font-sans text-slate-800">
        <div class="max-w-6xl mx-auto">
            <h1 class="text-4xl font-black mb-12 text-center text-slate-900 underline decoration-blue-500">🏢 건축물대장 JSON 계층 구조 맵</h1>
    """

    content = ""
    for page in pages:
        content += f'<div class="lv2-page"><h2 class="text-xl font-bold mb-6 text-slate-500">LEVEL 2: PAGE {page["id"]}</h2>'
        for section in page["sections"]:
            content += f"""
            <div class="lv3-section shadow-sm">
                <div class="lv3-header">LEVEL 3 SECTION (Base Y: {section['base_y']})</div>
                <div class="mb-4 text-[10px] font-mono text-slate-400">Section Raw Coords: {section['raw_coords']}</div>
                <div class="flex flex-wrap">
            """
            for item in section["items"]:
                content += f"""
                <div class="lv4-item shadow-sm">
                    <div class="flex flex-col gap-1 border-b border-slate-200 pb-2 mb-2">
                        <span class="text-[9px] font-bold text-blue-600">Start X: {item['start_x']}</span>
                        <span class="text-[9px] font-bold text-rose-600">Abs Start Y: {item['abs_y']}</span>
                        <span class="text-[8px] text-slate-400">Rel Box: {item['rel_box']}</span>
                    </div>
                    <div class="text-sm font-bold text-slate-800">{item['text']}</div>
                </div>
                """
            content += "</div></div>"
        content += "</div>"

    html_end = "</div></body></html>"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_start + content + html_end)
    
    print(f"✅ 계층형 대시보드 생성 완료: {html_path}")
    webbrowser.open('file://' + os.path.realpath(html_path))

if __name__ == "__main__":
    generate_hierarchy_dashboard()