import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

// 🛑 [필수] 사장님의 JavaScript 키
const KAKAO_JS_KEY = '3132f9851381ddf7951f933e2045ca8f';

// [기능 1] 강력해진 카카오맵 스크립트 로더
const useKakaoLoader = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 1. 이미 완벽하게 로드되어 있다면 즉시 통과
    if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
      setIsLoaded(true);
      return;
    }

    // 2. 스크립트 태그 생성 또는 찾기
    const scriptId = 'kakao-map-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      // autoload=false 필수 (React 제어권 확보)
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
      document.head.appendChild(script);
    }

    // 3. 로딩 완료될 때까지 감시 (가장 확실한 방법)
    const checkInterval = setInterval(() => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.load) {
        window.kakao.maps.load(() => {
          if (window.kakao.maps.services) {
            setIsLoaded(true);
            clearInterval(checkInterval);
          }
        });
      }
    }, 200); // 0.2초마다 체크

    return () => clearInterval(checkInterval);
  }, []);

  return isLoaded;
};

// [기능 2] 주변 정보 검색 함수 (분석용)
const searchNearby = (categoryCode, lat, lng) => {
  return new Promise((resolve) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      resolve([]); // 로드 안됐으면 빈 배열 반환
      return;
    }
    const ps = new window.kakao.maps.services.Places();
    ps.categorySearch(categoryCode, (data, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const sorted = data.sort((a, b) => a.distance - b.distance);
        resolve(sorted);
      } else {
        resolve([]);
      }
    }, {
      location: new window.kakao.maps.LatLng(lat, lng),
      radius: 2000,
      sort: window.kakao.maps.services.SortBy.DISTANCE
    });
  });
};

// [기능 3] 정적 지도 컴포넌트
const KakaoStaticMap = ({ lat, lng, isLoaded }) => {
  const mapRef = useRef(null);

  useEffect(() => {
    // 로딩이 안됐거나 좌표가 없으면 실행하지 않음
    if (!isLoaded || !lat || !lng || !mapRef.current || !window.kakao || !window.kakao.maps) return;

    const staticMapContainer = mapRef.current;
    const staticMapOption = {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: 3,
      marker: {
        position: new window.kakao.maps.LatLng(lat, lng),
        text: '매물위치'
      }
    };
    new window.kakao.maps.StaticMap(staticMapContainer, staticMapOption);
  }, [lat, lng, isLoaded]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }} />;
};

// [컴포넌트] 개별 매물 카드
const PropertyCard = ({ pin, index, isLoaded }) => {
  const [hoveredImage, setHoveredImage] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState("주변 정보를 분석하고 있습니다..."); 

  // 가격 표시
  const priceDisplay = (
    <span style={{ fontWeight: 'bold', color: '#111', fontSize: '1.2rem' }}>
        {pin.is_sale && `매매 ${Number(pin.sale_price).toLocaleString()}`}
        {pin.is_jeonse && `전세 ${Number(pin.jeonse_deposit).toLocaleString()}`}
        {pin.is_rent && `월세 ${Number(pin.rent_deposit).toLocaleString()} / ${Number(pin.rent_amount).toLocaleString()}`}
    </span>
  );

  const thumbnails = pin.image_urls ? pin.image_urls.slice(0, 3) : [];

  // ★ AI 분석 자동 생성 로직
  useEffect(() => {
    // 로딩이 완료되지 않았으면 실행하지 않음
    if (!isLoaded) return;

    const runAnalysis = async () => {
        try {
            const [subways, schools, marts, hospitals, convenience] = await Promise.all([
                searchNearby('SW8', pin.lat, pin.lng), // 지하철
                searchNearby('SC4', pin.lat, pin.lng), // 학교
                searchNearby('MT1', pin.lat, pin.lng), // 마트
                searchNearby('HP8', pin.lat, pin.lng), // 병원
                searchNearby('CS2', pin.lat, pin.lng)  // 편의점
            ]);

            // 1. 교통
            let trafficText = "";
            if (subways.length > 0) {
                const nearest = subways[0];
                trafficText += `- 🚇 지하철: ${nearest.place_name} (직선거리 ${nearest.distance}m) 이용 가능\n`;
                if (subways.length > 1) trafficText += `- 그 외: ${subways[1].place_name} (${subways[1].distance}m) 인접\n`;
            } else {
                trafficText += "- 🚇 지하철: 도보권 내 지하철역 없음 (차량/버스 이동 권장)\n";
            }
            if (pin.address) trafficText += `- 🛣️ 도로: ${pin.address} 인근, 주요 도로 접근성 양호`;

            // 2. 학군
            const elemSchools = schools.filter(s => s.place_name.includes('초등'));
            const midSchools = schools.filter(s => s.place_name.includes('중학교'));
            const highSchools = schools.filter(s => s.place_name.includes('고등'));
            
            let eduText = "";
            if (elemSchools.length > 0) eduText += `- 🏫 초등학교: ${elemSchools[0].place_name} (${elemSchools[0].distance}m)\n`;
            if (midSchools.length > 0) eduText += `- 🏫 중학교: ${midSchools[0].place_name} (${midSchools[0].distance}m)\n`;
            if (highSchools.length > 0) eduText += `- 🏫 고등학교: ${highSchools[0].place_name} (${highSchools[0].distance}m)\n`;
            if (!eduText) eduText = "- 🏫 반경 2km 이내 학교 시설 미확인\n";

            // 3. 병원/편의
            let infraText = "";
            if (marts.length > 0) infraText += `- 🛒 마트: ${marts[0].place_name} (${marts[0].distance}m)\n`;
            else if (convenience.length > 0) infraText += `- 🏪 편의시설: ${convenience[0].place_name} 등 인접\n`;
            
            if (hospitals.length > 0) {
                 const internal = hospitals.find(h => h.place_name.includes('내과'));
                 const dental = hospitals.find(h => h.place_name.includes('치과'));
                 const surgery = hospitals.find(h => h.place_name.includes('외과') || h.place_name.includes('정형'));
                 const general = hospitals.find(h => h.category_name.includes('종합병원')); 

                 const hospitalList = [];
                 if (general) hospitalList.push(`종합병원: ${general.place_name}`);
                 if (internal) hospitalList.push(`내과: ${internal.place_name}`);
                 if (surgery) hospitalList.push(`외과: ${surgery.place_name}`);
                 if (dental) hospitalList.push(`치과: ${dental.place_name}`);
                 
                 if (hospitalList.length > 0) {
                     infraText += `- 🏥 병원: ${hospitalList.join(', ')} 등 위치\n`;
                 } else {
                     infraText += `- 🏥 병원: ${hospitals[0].place_name} 등 의원급 다수 분포\n`;
                 }
            } else {
                infraText += "- 🏥 병원: 반경 2km 이내 병원 시설 미확인\n";
            }

            const finalText = `
[AI 입지 정밀 분석]

1. 교통 및 위치
${trafficText}

2. 학군 정보
${eduText.trim()}

3. 생활 편의 및 의료
${infraText.trim()}

4. 종합 의견
${subways.length > 0 ? '역세권 입지와' : '쾌적한 주거환경과'} ${schools.length > 0 ? '우수한 학군을' : '편리한 생활 인프라를'} 갖춘 추천 매물입니다.
            `.trim();

            setAiAnalysis(finalText);
        } catch (e) {
            console.error(e);
            setAiAnalysis("주변 정보 분석 실패 (네트워크 확인 필요)");
        }
    };

    runAnalysis();
  }, [isLoaded, pin]);

  return (
    <div style={{ marginBottom: '60px', backgroundColor: 'white' }}>
      
      {/* 1. 지도 & 사진 영역 */}
      <div style={{ position: 'relative', width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <KakaoStaticMap lat={pin.lat} lng={pin.lng} isLoaded={isLoaded} />
        
        <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: '#2563eb', color: 'white', padding: '6px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            추천 {index + 1}
        </div>

        <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 10 }}>
            {thumbnails.length > 0 ? (
                thumbnails.map((url, idx) => (
                    <div key={idx} onMouseEnter={() => setHoveredImage(url)} onMouseLeave={() => setHoveredImage(null)}
                        style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', backgroundColor: '#eee' }}>
                        <img src={url} alt={`사진 ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                ))
            ) : (
                <div style={{ padding: '10px 20px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: '8px', fontSize: '0.8rem' }}>사진 없음</div>
            )}
        </div>

        {hoveredImage && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
                <img src={hoveredImage} alt="확대" style={{ maxHeight: '90%', maxWidth: '90%', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
            </div>
        )}
      </div>

      {/* 2. 텍스트 정보 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px', marginBottom: '20px', padding: '0 5px' }}>
        <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#111', margin: '0 0 5px 0' }}>
                {pin.address && pin.address.split(' ').slice(0, 2).join(' ')} {pin.building_name || ''}
            </h2>
            <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#333' }}>
                {pin.detailed_address || '상세주소 미공개'}
            </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#4b5563', marginBottom: '5px' }}>
                {pin.property_type} ({pin.is_sale ? '매매' : pin.is_jeonse ? '전세' : '월세'})
            </div>
            <div>{priceDisplay}</div>
        </div>
      </div>

      {/* 3. 상세 분석 */}
      <div style={{ backgroundColor: '#e5e7eb', padding: '30px', borderRadius: '12px', marginBottom: '20px', minHeight: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <div style={{ width: '100%', textAlign: 'left' }}>
            <strong style={{ display: 'block', marginBottom: '10px', fontSize: '1.1rem', color: '#111' }}>상세 분석</strong>
            <div style={{ lineHeight: '1.8', color: '#374151', whiteSpace: 'pre-wrap', margin: 0, fontSize: '1rem' }}>
                
                {/* AI 분석 내용 (메모와 상관없이 항상 표시) */}
                {aiAnalysis}

                {/* 메모가 있으면 아래에 추가 표시 */}
                {pin.notes && (
                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #9ca3af', color: '#4b5563' }}>
                        <strong style={{ color:'#111' }}>[담당자 메모]</strong><br/>
                        {pin.notes}
                    </div>
                )}

            </div>
         </div>
      </div>

      {/* 4. 키워드 */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {pin.keywords && pin.keywords.split(',').map((k, i) => (
            <span key={i} style={{ backgroundColor: '#dc2626', color: 'white', padding: '8px 20px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {k.trim().startsWith('#') ? k.trim() : `#${k.trim()}`}
            </span>
        ))}
      </div>

    </div>
  );
};

// 메인 페이지
export default function ProposalViewer() {
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState(null);
  const [properties, setProperties] = useState([]);
  
  // 카카오맵 로더 호출
  const isLoaded = useKakaoLoader(); 

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) fetchProposal(shareId);
    else setLoading(false);
  }, []);

  const fetchProposal = async (shareId) => {
    const { data: propData, error } = await supabase.from('proposals').select('*').eq('id', shareId).single();
    if (error || !propData) { alert("유효하지 않은 제안서입니다."); setLoading(false); return; }
    setProposal(propData);
    if (propData.property_ids && propData.property_ids.length > 0) {
      const { data: pinsData } = await supabase.from('pins').select('*').in('id', propData.property_ids);
      setProperties(pinsData || []);
    }
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>제안서를 불러오는 중입니다...</div>;
  if (!proposal) return <div style={{ padding: '50px', textAlign: 'center' }}>제안서를 찾을 수 없습니다.</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: '"Noto Sans KR", sans-serif', color: '#333', backgroundColor: '#fff' }}>
      <header style={{ textAlign: 'center', marginBottom: '60px', paddingBottom: '20px', borderBottom: '3px solid #111' }}>
        <h1 style={{ color: '#111', marginBottom: '15px', fontSize: '2.5rem', fontWeight: '900' }}>{proposal.title}</h1>
        <p style={{ color: '#666', fontSize: '1.2rem' }}>고객님을 위해 엄선한 <strong>{properties.length}개</strong>의 프리미엄 매물입니다.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
        {properties.map((pin, index) => (
          <PropertyCard key={pin.id} pin={pin} index={index} isLoaded={isLoaded} />
        ))}
      </div>

      <footer style={{ marginTop: '100px', padding: '40px 0', textAlign: 'center', color: '#9ca3af', borderTop: '1px solid #eee' }}>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>본 문서는 보안 문서로 외부 유출을 금지합니다.</p>
        <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: '#333', fontSize: '1rem' }}>문의: 010-1234-5678 (담당 공인중개사)</p>
      </footer>
    </div>
  );
}