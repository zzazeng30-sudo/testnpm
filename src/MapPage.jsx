import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient.js' 
import styles from './MapPage.module.css' 

// 11일차: IM 자료 생성 기능 추가 (PDF 대신 텍스트 분석 자료 생성)

// API 설정
// 모델 이름을 안정적인 'gemini-2.5-flash'로 변경했습니다.
const API_MODEL = 'gemini-2.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
// 👇 발급받은 실제 Gemini API 키로 교체해야 합니다!
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY"; 

const PIN_IMAGE_URL = 'https://placehold.co/36x36/007bff/ffffff?text=P'

// API 호출 유틸리티 (지수 백오프 포함)
const exponentialBackoffFetch = async (url, options, maxRetries = 5) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // HTTP 429 (Rate Limit) 또는 기타 서버 에러 처리
        throw new Error(`HTTP error! status: ${response.status}`);
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

  // 11일차 추가 상태
  const [imContent, setImContent] = useState(null); // 생성된 IM 내용 (AI 분석 결과)
  const [isGenerating, setIsGenerating] = useState(false); // 생성 중 상태 (로딩 스피너 용)

  const mapRef = useRef(null); 
  const mapInstanceRef = useRef(null); 
  const markersRef = useRef({}); 
  

  // --- 1~4번 함수 (10일차와 동일) ---
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
            setImContent(null); // 핀 클릭 시 IM 내용 초기화
        });

        markersRef.current[pin.id] = marker;
    });
    
    if (pinData.length > 0 && map.getLevel() > 5) {
        map.setCenter(new window.kakao.maps.LatLng(pinData[0].lat, pinData[0].lng));
        map.setLevel(4);
    }
  };

  // 5. (Init) 지도 초기화 (10일차와 동일)
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const mapContainer = mapRef.current; 

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
        
        console.log("카카오맵 초기화 성공! DB 핀 로드 시작.");
        
        // 3. '오른쪽 클릭'으로 '새 핀 박기'
        window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
            handleCreatePin(mouseEvent.latLng); 
        });
        
        // 4. 지도 위에서 브라우저 '오른쪽 클릭 메뉴' 차단
        mapContainer.addEventListener('contextmenu', handleContextMenu);
        
        fetchPins(); 
        fetchCustomers(); 
    });

    // 6. 클린업 (Cleanup)
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

  // --- 7~11번 함수 (10일차와 동일) ---
  
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

  // 12. (Generate) IM 자료 생성 -> 반경 3km 입지 분석 (10일차 로직 변경)
  const handleGenerateIm = async (pin, linked) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setLoading(true); // 버튼 비활성화를 위해 사용
    setImContent(null);

    // LLM에게 '반경 3km 입지 분석가' 역할을 부여하는 새로운 시스템 프롬프트
    const systemPrompt = `당신은 숙련된 부동산 입지 분석가입니다. 주어진 매물 좌표를 바탕으로, 해당 위치 반경 3km 이내의 주요 생활 편의 시설 및 공공 시설 현황을 조사하고 간결하게 요약해야 합니다.
분석 결과는 마크다운 목록 형식으로 다음 카테고리를 포함해야 합니다: [교육 시설], [교통 및 공공 기관], [생활 편의 시설].`;

    // LLM에게 매물 좌표와 원하는 시설 유형을 전달하는 새로운 사용자 쿼리
    const userQuery = `다음 위치의 반경 3km 이내 시설 정보를 요약해 주세요.
- 위치(좌표): 위도 ${pin.lat}, 경도 ${pin.lng}
- 매물 ID: ${pin.id}
- 분석을 원하는 주요 시설 유형: 동사무소, 초등학교, 중학교, 고등학교, 대형마트, 편의점, 병원/약국, 공원.`;
    
    // ★★★ 400 에러 해결을 위한 공식 REST API payload 구조로 변경 ★★★
    const payload = {
      // 1. 시스템 지시 (systemInstruction)를 config 밖으로 꺼냅니다.
      systemInstruction: { parts: [{ text: systemPrompt }] }, 
      // 2. 사용자 요청 (contents)
      contents: [{ role: 'user', parts: [{ text: userQuery }] }],
    };

    // API 키가 비어있는지 확인
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
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setImContent(generatedText);
      } else {
        setImContent("입지 분석 자료 생성에 실패했습니다. (응답 없음)");
      }
      
    } catch (error) {
      console.error('입지 분석 API 호출 오류:', error);
      setImContent(`입지 분석 자료 생성 중 오류 발생: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setLoading(false); // 로딩 상태는 IM 생성 후 해제
    }
  };


  // --- 화면 렌더링 (11일차에 맞게 수정) ---
  return (
    <div className={styles.pageContainerMap}>
      
      {/* 2-1. 매물 정보 사이드바 */}
      <aside 
        className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        {selectedPin && (
          <div className={styles.sidebarContent}>
            
            {/* --- 5일차: 수정 폼 --- */}
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
              
              {/* 11일차: IM 자료 생성 -> 입지 분석 버튼으로 변경 */}
              <div className={styles.pdfButtonContainer}>
                  <button 
                      onClick={() => handleGenerateIm(selectedPin, linkedCustomers)} 
                      type="button" 
                      className={`${styles.button} ${styles.buttonPurple}`} 
                      disabled={isGenerating || loading}
                  >
                      {isGenerating ? '입지 분석 중...' : '반경 3km 입지 분석'}
                  </button>
              </div>
              
            </form>
            
            {/* --- 7일차: 고객 연결 폼 --- */}
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
          {!window.kakao && (
              <div className={styles.mapError}>
                index.html에서 카카오맵 로딩 중... (키/도메인 확인)
              </div>
          )}
        </div>

      </section>
      
      {/* 11일차: IM 자료 표시 모달 -> 입지 분석 모달로 변경 */}
      {imContent && (
        <div className={styles.imModalOverlay}>
          <div className={styles.imModal}>
            <h2 className={styles.imModalTitle}>AI 생성 반경 3km 입지 분석</h2>
            {/* 마크다운 텍스트를 HTML로 렌더링 */}
            <div className={styles.imContentScroll}>
              <div dangerouslySetInnerHTML={{ __html: imContent.replace(/\n/g, '<br/>') }} />
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