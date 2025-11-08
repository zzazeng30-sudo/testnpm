import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js' 
import styles from './MapPage.module.css' 

// API 설정
const API_MODEL = 'gemini-2.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY"; // (사장님 키)

const PIN_IMAGE_URL = 'https://placehold.co/36x36/007bff/ffffff?text=P'

// API 호출 유틸리티 (지수 백오프 포함)
const exponentialBackoffFetch = async (url, options, maxRetries = 5) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! ${response.status}`);
      }
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.warn(`Fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay.toFixed(0)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};


export default function MapPage({ session }) {
  const [pins, setPins] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [selectedPin, setSelectedPin] = useState(null)
  
  const [editMemo, setEditMemo] = useState('')
  const [editPrice, setEditPrice] = useState(0)

  const [customers, setCustomers] = useState([]) 
  const [linkedCustomers, setLinkedCustomers] = useState([])

  const [imContent, setImContent] = useState(null); 
  const [isGenerating, setIsGenerating] = useState(false); 

  const [tourPins, setTourPins] = useState([]); 
  const [routeLine, setRouteLine] = useState(null); 

  const mapRef = useRef(null); 
  const mapInstanceRef = useRef(null); 
  const markersRef = useRef({}); 
  

  // 1. (Read) 핀 읽어오기
  const fetchPins = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false }); 
    if (error) console.error('핀 로드 오류:', error.message);
    else {
      setPins(data || []);
      if (mapInstanceRef.current) {
        drawMarkers(mapInstanceRef.current, data || []);
      }
    }
    setLoading(false);
  };
  
  // 2. (Read) 고객 읽어오기
  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (error) console.error('고객 리스트 로드 오류:', error.message);
    else setCustomers(data || []);
  };

  // 3. (Read) 연결된 고객 읽어오기
  const fetchLinkedCustomers = async (pinId) => {
    if (!pinId) { setLinkedCustomers([]); return; }
    const { data, error } = await supabase.from('customer_pins').select(` id, customer:customers ( id, name ) `).eq('pin_id', pinId);
    if (error) console.error('연결된 고객 로드 오류:', error.message);
    else setLinkedCustomers(data || []);
  };

  // 4. (Draw) 마커 그리기
  const drawMarkers = (map, pinData) => {
    if (!window.kakao || !map) return;
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};
    const imageSize = new window.kakao.maps.Size(36, 36);
    const markerImage = new window.kakao.maps.MarkerImage(PIN_IMAGE_URL, imageSize);
    pinData.forEach(pin => {
        const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
        const marker = new window.kakao.maps.Marker({ map, position, image: markerImage });
        
        window.kakao.maps.event.addListener(marker, 'click', () => { 
            setSelectedPin(pin);
            setEditMemo(pin.memo || '');
            setEditPrice(pin.price || 0);
            fetchLinkedCustomers(pin.id);
            setImContent(null); 
        });

        markersRef.current[pin.id] = marker;
    });
    
    if (pinData.length > 0 && map.getLevel() > 5) {
        map.setCenter(new window.kakao.maps.LatLng(pinData[0].lat, pinData[0].lng));
        map.setLevel(4);
    }
  };

  // 5. (Init) 지도 초기화 (★ 14일차 '로드 타이밍' 최종 수정본)
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const mapContainer = mapRef.current; 

    // 표준 방식: index.html의 autoload=false에 따라 수동 load() 호출
    window.kakao.maps.load(() => {
        if (!mapContainer) return; 
        
        const options = {
            center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
            level: 4,
            draggable: true, 
            scrollwheel: true
        };
        const map = new window.kakao.maps.Map(mapContainer, options);
        
        mapInstanceRef.current = map; 
        
        console.log("MapPage: kakao.maps.load() 성공. 'services' 객체를 검사합니다.");

        if (window.kakao.maps.services) {
            console.log("✅ [진단] 'window.kakao.maps.services' 객체가 존재합니다.");
            console.log("✅ [진단] 'services.Directions' 객체:", window.kakao.maps.services.Directions);
        } else {
            console.error("❌ [진단] 'window.kakao.maps.services' 객체가 undefined입니다.");
            console.error("❌ [진단] 원인: 1)광고 차단기, 2)카카오 콘솔 도메인 등록 실패");
        }

        window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
            handleCreatePin(mouseEvent.latLng); 
        });
        
        mapContainer.addEventListener('contextmenu', handleContextMenu);
        
        fetchPins(); 
        fetchCustomers(); 
    });

    return () => {
        if (mapContainer) {
          mapContainer.removeEventListener('contextmenu', handleContextMenu);
        }
    };

  }, []); 

  // 6. (Re-draw) 핀 데이터 바뀌면 마커 다시 그리기
  useEffect(() => {
    if (mapInstanceRef.current) {
        drawMarkers(mapInstanceRef.current, pins);
    }
  }, [pins]); 

  
  // 7. (Create) 핀 생성
  const handleCreatePin = async (latLng) => {
    setLoading(true);
    const newPinData = { lat: latLng.getLat(), lng: latLng.getLng(), memo: '새 매물 (수정 필요)', price: 0 };
    const { data, error } = await supabase.from('pins').insert(newPinData).select(); 
    if (error) console.error('핀 생성 오류:', error.message);
    else {
      const createdPin = data[0];
      setPins(currentPins => [createdPin, ...currentPins]);
      setSelectedPin(createdPin);
      setEditMemo(createdPin.memo || '');
      setEditPrice(createdPin.price || 0);
      fetchLinkedCustomers(createdPin.id); 
      setImContent(null);
    }
    setLoading(false);
  };

  // 8. (Delete) 핀 삭제
  const handleDeletePin = async (pinId) => {
    setLoading(true);
    const { error } = await supabase.from('pins').delete().eq('id', pinId); 
    if (error) console.error('핀 삭제 오류:', error.message);
    else {
      setPins(currentPins => currentPins.filter(p => p.id !== pinId));
      setSelectedPin(null);
      handleRemoveFromTour(pinId);
    }
    setLoading(false);
  };

  // 9. (Update) 핀 수정
  const handleUpdatePin = async (pinId) => {
    setLoading(true);
    const updatedData = { memo: editMemo, price: editPrice };
    const { data, error } = await supabase.from('pins').update(updatedData).eq('id', pinId).select(); 
    if (error) console.error('핀 수정 오류:', error.message);
    else {
      const updatedPin = data[0];
      setPins(currentPins => currentPins.map(p => (p.id === pinId ? updatedPin : p)));
      setSelectedPin(updatedPin);
      setTourPins(currentTourPins => 
        currentTourPins.map(p => (p.id === pinId ? updatedPin : p))
      );
    }
    setLoading(false);
  };

  // 10. (Link) 핀-고객 연결
  const handleLinkCustomer = async (pinId, customerId) => {
    if (!customerId) return;
    if (linkedCustomers.find(link => link.customer && link.customer.id === customerId)) return;
    setLoading(true);
    const { data, error } = await supabase.from('customer_pins').insert({ pin_id: pinId, customer_id: customerId }).select('id, customer:customers(id, name)');
    if (error) console.error('고객 연결 오류:', error.message);
    else {
      const newLink = data[0];
      setLinkedCustomers(currentLinks => [...currentLinks, newLink]);
    }
    setLoading(false);
  };
  
  // 11. (Unlink) 핀-고객 연결 해제
  const handleUnlinkCustomer = async (linkId) => {
    setLoading(true);
    const { error } = await supabase.from('customer_pins').delete().eq('id', linkId);
    if (error) console.error('고객 연결 해제 오류:', error.message);
    else setLinkedCustomers(currentLinks => currentLinks.filter(link => link.id !== linkId));
    setLoading(false);
  };

  // ★★★ (수정됨) 12. (Generate) 입지 분석 - 2단계 (카카오 검색 -> AI 요약)
  
  // 12-1. 카카오 '장소 검색'을 Promise로 감싸는 헬퍼 함수
  const searchNearby = (ps, keyword, lat, lng) => {
    return new Promise((resolve) => {
      const options = {
        location: new window.kakao.maps.LatLng(lat, lng),
        radius: 3000, // 반경 3km (3000m)
        sort: window.kakao.maps.services.SortBy.DISTANCE, // 거리순
        size: 5 // 최대 5개
      };
      
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          // '장소 이름'만 추출하여 배열로 반환
          const placeNames = data.map(place => place.place_name);
          resolve(placeNames);
        } else {
          resolve([]); // 검색 결과가 없거나 실패하면 빈 배열 반환
        }
      }, options);
    });
  };

  // 12-2. 메인 핸들러 함수 (수정됨)
  const handleGenerateIm = async (pin) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setLoading(true); 
    setImContent(null);

    // --- 1단계: 카카오맵 '장소 검색' (실제 데이터 수집) ---
    if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Places) {
      setImContent("카카오맵 'Places' 라이브러리 로드 실패. (도메인 등록, 광고 차단기 확인)");
      setIsGenerating(false);
      setLoading(false);
      return;
    }

    let realData = ""; // AI에게 전달할 실제 데이터 텍스트
    try {
      const ps = new window.kakao.maps.services.Places();
      
      // Promise.all로 여러 카테고리를 '동시에' 검색
      const [schools, marts, hospitals, subways] = await Promise.all([
        searchNearby(ps, '학교', pin.lat, pin.lng),
        searchNearby(ps, '대형마트', pin.lat, pin.lng),
        searchNearby(ps, '병원', pin.lat, pin.lng),
        searchNearby(ps, '지하철역', pin.lat, pin.lng)
      ]);

      // AI에게 전달할 '실제 데이터' 문자열 생성
      realData = `
        [교육 시설 (학교)]
        ${schools.length > 0 ? schools.join(', ') : '반경 3km 내 검색 결과 없음'}

        [생활 편의 (대형마트)]
        ${marts.length > 0 ? marts.join(', ') : '반경 3km 내 검색 결과 없음'}

        [의료 시설 (병원)]
        ${hospitals.length > 0 ? hospitals.join(', ') : '반경 3km 내 검색 결과 없음'}

        [교통 시설 (지하철역)]
        ${subways.length > 0 ? subways.join(', ') : '반경 3km 내 검색 결과 없음'}
      `;
      
    } catch (searchError) {
      console.error('카카오 장소 검색 오류:', searchError);
      setImContent(`카카오 장소 검색 중 오류 발생: ${searchError.message}`);
      setIsGenerating(false);
      setLoading(false);
      return;
    }
    
    // --- 2단계: Gemini '요약' ---
    
    // (수정) 시스템 프롬프트: AI에게 '요약' 역할만 부여
    const systemPrompt = `당신은 숙련된 부동산 입지 분석가입니다. 당신의 임무는 주어진 '실제 주변 시설 목록' 데이터를 바탕으로, 고객에게 브리핑하기 좋은 '전문적인 요약 리포트'를 작성하는 것입니다.
    
    - '실제 주변 시설 목록'에 없는 내용은 절대 추가하지 마십시오.
    - 데이터를 단순 나열하지 말고, "교육 환경으로는...", "생활 편의성 면에서는...", "교통 접근성은..."과 같이 자연스러운 문장으로 재구성하십시오.
    - 긍정적인 면을 부각하되, "검색 결과 없음" 항목은 "추가 확인 필요" 또는 "조용한 주거 환경" 등으로 부드럽게 표현하십시오.`;

    // (수정) 사용자 쿼리: '실제 데이터'를 AI에게 전달
    const userQuery = `다음은 이 매물(위도: ${pin.lat}, 경도: ${pin.lng})의 반경 3km 이내 '실제 주변 시설 목록'입니다. 이 데이터를 바탕으로 부동산 브리핑 리포트를 작성해 주세요.
    
    ---
    [실제 주변 시설 목록]
    ${realData}
    ---
    
    리포트를 시작해 주세요:`;
    
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] }, 
      contents: [{ role: 'user', parts: [{ text: userQuery }] }],
    };

    if (!API_KEY || API_KEY === "YOUR_ACTUAL_GEMINI_API_KEY_HERE") {
        setImContent("Gemini API 키가 입력되지 않았습니다. src/MapPage.jsx 파일의 API_KEY 변수를 확인하세요.");
        setIsGenerating(false);
        setLoading(false);
        return;
    }

    try {
      const response = await exponentialBackoffFetch(
        `${API_URL}${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      
      const result = await response.json();
      // ★ (수정) AI가 생성한 '요약 리포트'를 표시
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setImContent(generatedText);
      } else {
        setImContent("AI 요약 리포트 생성에 실패했습니다. (응답 없음)");
      }
      
    } catch (error) {
      console.error('Gemini API 호출 오류:', error);
      setImContent(`AI 리포트 생성 중 오류 발생: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setLoading(false); 
    }
  };


  // --- 14일차: 임장 동선 최적화 함수들 ---

  // 13. (Tour) 임장 목록에 핀 추가
  const handleAddToTour = (pinToAdd) => {
    if (!pinToAdd) return;
    if (tourPins.find(p => p.id === pinToAdd.id)) {
      alert("이미 임장 목록에 추가된 매물입니다.");
      return;
    }
    setTourPins(prev => [...prev, pinToAdd]);
    setSelectedPin(null); 
  };

  // 14. (Tour) 임장 목록에서 핀 제거
  const handleRemoveFromTour = (pinId) => {
    setTourPins(prev => prev.filter(p => p.id !== pinId));
    if (routeLine) {
        routeLine.setMap(null);
        setRouteLine(null);
    }
  };

  // 15. (Tour) 임장 목록 전체 초기화
  const handleClearTour = () => {
    setTourPins([]);
    if (routeLine) {
        routeLine.setMap(null);
        setRouteLine(null);
    }
  };

  // 16. (Tour) [필살기] 임장 동선 최적화 실행
  const handleOptimizeTour = async () => {
    if (tourPins.length < 2) {
      alert("경로를 최적화하려면 2개 이상의 매물을 목록에 추가해야 합니다.");
      return;
    }
    
    if (!window.kakao.maps.services || !window.kakao.maps.services.Directions) {
        console.error("❌ [진단] '경로 최적화' 버튼 클릭 시점: 'services.Directions' 객체가 없습니다!");
        alert("카카오맵 'services.Directions' 라이브러리 로딩에 실패했습니다. F12 콘솔의 [진단] 로그를 확인하세요. (광고 차단기 또는 도메인 등록 문제)");
        return;
    }
    
    setLoading(true);

    try {
        const d = new window.kakao.maps.services.Directions();

        const origin = { x: tourPins[0].lng, y: tourPins[0].lat };
        const destination = { x: tourPins[tourPins.length - 1].lng, y: tourPins[tourPins.length - 1].lat };
        const waypoints = tourPins.slice(1, -1).map(p => ({ x: p.lng, y: p.lat }));

        const request = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            optimize: true 
        };

        const result = await new Promise((resolve, reject) => {
            d.route(request, (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    resolve(result);
                } else {
                    reject(new Error(`카카오 길 찾기 API 실패: ${status}`));
                }
            });
        });

        const route = result.routes[0];
        if (route) {
            if (routeLine) {
                routeLine.setMap(null);
            }

            const linePath = route.polyline.getPath();
            
            const polyline = new window.kakao.maps.Polyline({
                path: linePath,
                strokeWeight: 6,
                strokeColor: '#FF0000', 
                strokeOpacity: 0.8,
                strokeStyle: 'solid'
            });

            polyline.setMap(mapInstanceRef.current);
            setRouteLine(polyline); 

            const optimizedOrder = route.waypoint_order; 
            const originalWaypoints = tourPins.slice(1, -1); 
            
            const optimizedWaypoints = optimizedOrder.map(idx => originalWaypoints[idx]);
            
            setTourPins([
                tourPins[0], 
                ...optimizedWaypoints, 
                tourPins[tourPins.length - 1] 
            ]);
            
            alert(`총 거리: ${(route.summary.distance / 1000).toFixed(1)}km, 예상 시간: ${Math.round(route.summary.duration / 60)}분 (최적화 완료)`);
        }

    } catch (error) {
        console.error('임장 동선 최적화 오류:', error);
        alert(`경로 탐색 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };


  // --- 화면 렌더링 ---
  return (
    <div className={styles.pageContainerMap}>
      
      {/* 14일차: 임장 동선 최적화 패널 */}
      <aside className={styles.tourPanel}>
        <h3 className={styles.tourTitle}>
          🚩 임장 동선 최적화 ({tourPins.length})
        </h3>
        <div className={styles.tourList}>
          {tourPins.length === 0 && (
            <p className={styles.emptyText}>선택된 핀의 [임장 목록에 추가] 버튼을 눌러 매물을 담아주세요.</p>
          )}
          {tourPins.map((pin, index) => (
            <div key={pin.id} className={styles.tourItem}>
              <span className={styles.tourItemIndex}>{index + 1}</span>
              <span className={styles.tourItemMemo} title={pin.memo}>
                {pin.memo.length > 15 ? `${pin.memo.substring(0, 15)}...` : pin.memo}
              </span>
              <button 
                onClick={() => handleRemoveFromTour(pin.id)}
                className={styles.tourRemoveButton}
                disabled={loading || isGenerating}
              >
                제거
              </button>
            </div>
          ))}
        </div>
        <div className={styles.tourButtonContainer}>
          <button
            onClick={handleClearTour}
            className={`${styles.button} ${styles.buttonGray}`}
            disabled={loading || isGenerating || tourPins.length === 0}
          >
            초기화
          </button>
          <button
            onClick={handleOptimizeTour}
            className={`${styles.button} ${styles.buttonOrange}`}
            disabled={loading || isGenerating || tourPins.length < 2}
          >
            {loading ? '...' : '경로 최적화'}
          </button>
        </div>
      </aside>
      
      {/* 2-1. 매물 정보 사이드바 */}
      <aside 
        className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        {selectedPin && (
          <div className={styles.sidebarContent}>
            
            <form 
              key={selectedPin.id}
              onSubmit={(e) => {
                e.preventDefault(); 
                handleUpdatePin(selectedPin.id);
              }}
            >
              <h2 className={styles.sidebarTitle}>
                매물 정보
              </h2>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>메모</label>
                <textarea
                  className={styles.textarea}
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="매물에 대한 상세 정보를 입력하세요..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>가격 (만원)</label>
                <input
                  className={styles.input}
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  placeholder="숫자만 입력 (단위: 만원)"
                />
              </div>
              <p className={styles.metaText}>ID: {selectedPin.id}</p>
              
              <div className={styles.buttonGroup}>
                  <button onClick={() => setSelectedPin(null)} type="button" className={`${styles.button} ${styles.buttonGray}`}>
                      닫기
                  </button>
                  <button onClick={() => handleDeletePin(selectedPin.id)} type="button" className={`${styles.button} ${styles.buttonRed}`} disabled={loading || isGenerating}>
                      {loading ? '...' : '삭제'}
                  </button>
                  <button type="submit" className={`${styles.button} ${styles.buttonBlue}`} disabled={loading || isGenerating}>
                      {loading ? '...' : '저장'}
                  </button>
              </div>
              
              {/* (수정) 입지 분석 버튼 */}
              <div className={styles.pdfButtonContainer}>
                  <button 
                      onClick={() => handleGenerateIm(selectedPin)} 
                      type="button" 
                      className={`${styles.button} ${styles.buttonPurple}`} 
                      disabled={isGenerating || loading}
                  >
                      {isGenerating ? 'AI 입지 분석 중...' : 'AI 입지 분석 (정확도 UP)'}
                  </button>
              </div>
              
              {/* 14일차: 임장 목록 추가 버튼 */}
              <div className={styles.pdfButtonContainer}>
                  <button 
                      onClick={() => handleAddToTour(selectedPin)} 
                      type="button" 
                      className={`${styles.button} ${styles.buttonGreen}`} 
                      disabled={isGenerating || loading}
                  >
                      🚩 임장 목록에 추가
                  </button>
              </div>
              
            </form>
            
            {/* 고객 연결 폼 */}
            <div className={styles.customerMatcher}>
                <h3 className={styles.sidebarSubtitle}>
                    고객 매칭
                </h3>
                <form 
                  onSubmit={(e) => {
                      e.preventDefault();
                      const customerId = e.target.elements['customer-select'].value;
                      handleLinkCustomer(selectedPin.id, Number(customerId)); 
                  }}
                >
                    <label className={styles.label}>고객 선택</label>
                    <select 
                      id="customer-select"
                      className={styles.input}
                      defaultValue=""
                    >
                        <option value="" disabled>-- 6일차에 등록한 고객 --</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                              {customer.name} ({customer.phone})
                          </option>
                        ))}
                    </select>
                    <button type="submit" className={`${styles.button} ${styles.buttonCyan}`} disabled={loading || isGenerating}>
                        {loading ? '...' : '이 핀에 고객 연결'}
                    </button>
                </form>
                
                <div className={styles.linkedListContainer}>
                    <h4 className={styles.linkedListTitle}>연결된 고객 목록</h4>
                    {linkedCustomers.length === 0 && <p className={styles.emptyText}>아직 이 핀에 연결된 고객이 없습니다.</p>}
                    <ul className={styles.linkedList}>
                        {linkedCustomers.map(link => (
                          <li key={link.id} className={styles.linkedListItem}>
                              <span>{link.customer ? link.customer.name : '삭제된 고객'}</span>
                              <button 
                                onClick={() => handleUnlinkCustomer(link.id)}
                                className={styles.unlinkButton}
                                disabled={loading || isGenerating}
                              >
                                  연결 해제
                              </button>
                          </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        )}
        {!selectedPin && (
          <div className={styles.sidebarEmpty}>
            <p>지도를 클릭하여 새 핀을 등록하세요.</p>
            <p className={styles.metaText}>(★ 10일차: '오른쪽 클릭'으로 핀 생성)</p>
            {(loading || isGenerating) && <p>데이터 로딩 중...</p>}
            {!loading && pins.length === 0 && <p>저장된 핀이 없습니다.</p>}
          </div>
        )}
      </aside>
      
      {/* 2-2. 카카오 지도 영역 */}
      <section className={styles.mapSection}>
        
        {(loading && !selectedPin) && ( 
          <div className={styles.loadingOverlay}>
            <h3>데이터 로딩 중...</h3>
          </div>
        )}

        <div ref={mapRef} className={styles.map}>
          {!window.kakao.maps && (
              <div className={styles.mapError}>
                카카오맵 로딩 실패. (API 키, 도메인 등록, 광고 차단기 확인)
              </div>
          )}
        </div>

      </section>
      
      {/* 입지 분석 모달 */}
      {imContent && (
        <div className={styles.imModalOverlay}>
          <div className={styles.imModal}>
            <h2 className={styles.imModalTitle}>AI 생성 입지 분석 (실데이터 기반)</h2>
            <div className={styles.imContentScroll}>
              {/* (수정) AI가 생성한 요약 리포트는 마크다운 형식이므로 pre-wrap으로 렌더링 */}
              <pre className={styles.imContentPre}>{imContent}</pre>
            </div>
            <button 
              onClick={() => setImContent(null)} 
              className={`${styles.button} ${styles.buttonRed}`}
            >
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  )
}