import json
import os
import re

def strip_metadata():
    base_path = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_path, "test.json")
    output_path = os.path.join(base_path, "cleaned_test.json")

    if not os.path.exists(input_path):
        return print(f"❌ 오류: '{input_path}' 파일을 찾을 수 없습니다.")

    try:
        # 1. 파일 읽기 (BOM 방지를 위해 utf-8-sig 사용)
        with open(input_path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

        # 2. 재귀적으로 데이터를 탐색하며 청소하는 함수
        def clean_node(obj):
            # 배열(List) 처리
            if isinstance(obj, list):
                # 데이터 셀(Level 4)인 경우: [4, "스타일", ...]
                if len(obj) >= 4 and obj[0] == 4:
                    try:
                        # 스타일 문자열에서 컬럼 ID 추출 (예: "3,1,1..." -> "1")
                        style_str = obj[1]
                        col_id = style_str.split(',')[3] if isinstance(style_str, str) and ',' in style_str else "0"
                        
                        # 텍스트 데이터 찾기 (리스트 내의 문자열 중 메타데이터가 아닌 것 추출)
                        final_text = ""
                        for item in obj:
                            if isinstance(item, str) and len(item) > 0:
                                # 숫자로만 된 좌표 문자열("0,0,0,0" 등)이나 스타일 문자열 제외
                                if not re.match(r'^[\d,.-]*$', item) and item != style_str:
                                    final_text = item
                                    break
                        
                        # ⚠️ 핵심 정보만 남기고 리턴: [레벨, 컬럼, 텍스트]
                        return [4, f"Col {col_id}", final_text]
                    except:
                        return None
                
                # 일반 배열은 내부 요소들을 필터링하여 유지
                cleaned_list = [clean_node(item) for item in obj]
                return [i for i in cleaned_list if i is not None]

            # 객체(Dict) 처리
            elif isinstance(obj, dict):
                cleaned_dict = {}
                for k, v in obj.items():
                    # "a", "h" 등의 키 구조는 유지하되 내부 데이터만 청소
                    cleaned_val = clean_node(v)
                    if cleaned_val is not None:
                        # 빈 배열이나 빈 객체가 된 경우 제외하고 의미 있는 데이터만 수집
                        if isinstance(cleaned_val, (list, dict)) and len(cleaned_val) == 0:
                            continue
                        cleaned_dict[k] = cleaned_val
                return cleaned_dict

            # 숫자 좌표나 단순 속성값은 삭제 (None 리턴 시 부모 배열에서 제거됨)
            return None

        # 3. 데이터 정제 실행
        result = clean_node(data)

        # 4. 결과 저장 (가독성을 위해 들여쓰기 적용)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        print(f"✅ 정제 완료! '{output_path}' 파일을 확인해 보세요.")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    strip_metadata()