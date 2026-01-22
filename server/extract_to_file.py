import json
import os

def extract_pattern_to_file():
    base_path = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_path, "result1.json")
    output_path = os.path.join(base_path, "extracted_data.json")

    if not os.path.exists(input_path):
        return print(f"❌ 오류: '{input_path}' 파일이 없습니다.")

    try:
        with open(input_path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        results = []

        # 재귀적으로 탐색하며 대표님이 찾은 패턴 추출
        def collect_pattern(obj):
            if isinstance(obj, list):
                # 패턴 확인: ["2,0,0,0,0", [글자배열, 좌표배열]]
                if len(obj) >= 2 and obj[0] == "2,0,0,0,0" and isinstance(obj[1], list):
                    content = obj[1]
                    if len(content) >= 2:
                        chars = content[0]   # ["민", "중", "태"]
                        coords = content[1]  # [130, 159, 188]
                        
                        # 글자 합치기 (특수기호 '+'는 공백으로 변환)
                        text_combined = "".join([c if c != "+" else " " for c in chars])
                        
                        results.append({
                            "text": text_combined,
                            "coordinates": coords
                        })
                
                for item in obj:
                    collect_pattern(item)
            
            elif isinstance(obj, dict):
                for v in obj.values():
                    collect_pattern(v)

        # 실행
        collect_pattern(data)

        # 결과 파일 저장
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print(f"✅ 추출 완료! 총 {len(results)}개의 데이터 셋을 찾았습니다.")
        print(f"📂 파일 경로: {output_path}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    extract_pattern_to_file()