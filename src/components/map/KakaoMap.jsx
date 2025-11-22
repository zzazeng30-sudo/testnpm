// src/components/map/KakaoMap.jsx (전체 덮어쓰기 - 수정됨)
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../contexts/MapContext';
import { supabase } from "../../lib/supabaseClient";
import styles from "../../features/map/pages/MapPage.module.css";

// --- 1. 디바운스(Debounce) 헬퍼 함수 ---
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
// --- (여기까지) ---

// ✅ [추가] 두 좌표 간의 각도(pan)를 계산하는 헬퍼 함수
// (origin: 카메라 위치, target: 바라볼 핀 위치)
function calculatePanAngle(origin, target) {
  try {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => (rad * 180 / Math.PI + 360) % 360; // 0~360 범위

    const lat1 = toRad(origin.getLat());
    const lng1 = toRad(origin.getLng());
    const lat2 = toRad(target.getLat());
    const lng2 = toRad(target.getLng());

    const dLng = lng2 - lng1;

    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
              Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    const bearingRad = Math.atan2(y, x);
    const bearingDeg = toDeg(bearingRad);

    // 카카오 로드뷰의 pan 값은 북쪽(0) 기준으로 시계방향입니다.
    // bearingDeg가 정확히 이 값입니다.
    return bearingDeg;

  } catch (e) {
    console.error("각도 계산 오류:", e);
    return 0; // 오류 시 북쪽(0) 반환
  }
}


export default function KakaoMap() {
  const {
    session,
    mapInstanceRef,
    tempMarkerRef,
    clearTempMarkerAndMenu,
    setSelectedPin,
    setContextMenu,
    fetchPins,
    fetchCustomers,
    mapRef, 
    activeMapType,

    // ★ [수정] roadviewMode, setRoadviewMode
    roadviewMode, 
    setRoadviewMode,
    
    handleMapMove, 
    
    isListForced, 
    
    clustererRef, 
    
    setIsListForced,
    setListTitle,
    setActiveOverlayKey,

    selectedPin 
  } = useMap();

  // ✅ 로드뷰 화면을 담을 컨테이너와 객체 Ref
  const roadviewContainerRef = useRef(null);
  const roadviewRef = useRef(null);
  const roadviewClientRef = useRef(null);
  
  const isListForcedRef = useRef(isListForced);
  useEffect(() => {
    isListForcedRef.current = isListForced;
  }, [isListForced]);


  // 5. (Init) 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const handleContextMenu = (e) => e.preventDefault();

    // (getInitialCenter 헬퍼 함수 ... 변경 없음)
    const getInitialCenter = (geocoder, defaultCenter) => {
      return new Promise(async (resolve) => {
        if (!session || !session.user) {
          resolve(defaultCenter); return;
        }
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('address')
            .eq('id', session.user.id)
            .single();
          if (profileError || !profile.address) {
            resolve(defaultCenter); return;
          }
          geocoder.addressSearch(profile.address, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              resolve(new window.kakao.maps.LatLng(result[0].y, result[0].x));
            } else {
              resolve(defaultCenter);
            }
          });
        } catch (error) {
          resolve(defaultCenter);
        }
      });
    };

    // --- kakao.maps.load() ---
    window.kakao.maps.load(async () => {
      
      const mapContainer = mapRef.current;
      if (!mapContainer) {
        return;
      }

      // (지도 생성 ... 변경 없음)
      const DEFAULT_CENTER = new window.kakao.maps.LatLng(37.566826, 126.9786567);
      const DEFAULT_ZOOM = 4;

      if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        console.error("❌ [진단] Geocoder 서비스 로드 실패. (services 라이브러리 확인!)");
        mapInstanceRef.current = new window.kakao.maps.Map(mapContainer, { center: DEFAULT_CENTER, level: DEFAULT_ZOOM });
      } else {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const initialCenter = await getInitialCenter(geocoder, DEFAULT_CENTER);
        const options = {
          center: initialCenter, level: DEFAULT_ZOOM, draggable: true, scrollwheel: true
        };
        mapInstanceRef.current = new window.kakao.maps.Map(mapContainer, options);
      }
      
      const map = mapInstanceRef.current;
      
      // (클러스터러, RoadviewClient 초기화 ... 변경 없음)
      if (window.kakao.maps.MarkerClusterer) {
        clustererRef.current = new window.kakao.maps.MarkerClusterer({
            map: map,
            averageCenter: true, 
            minLevel: 3, 
        });
      } else {
        console.error("❌ [진단] MarkerClusterer 라이브러리 로드 실패.");
      }
      
      if (window.kakao.maps.RoadviewClient) {
        roadviewClientRef.current = new window.kakao.maps.RoadviewClient();
        console.log("✅ [진단] RoadviewClient 초기화 성공.");
      } else {
        console.error("❌ [진단] RoadviewClient 객체 로드 실패. (기본 API 로드 확인)");
      }


      // ('rightclick' 이벤트 ... 변경 없음)
      window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
        // ... (우클릭 핀 생성 로직 ... 변경 없음) ...
        clearTempMarkerAndMenu();
        setSelectedPin(null);
        
        const content = document.createElement('div');
        content.className = styles.tempPin; 
        
        content.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="fill: #DC2626; width: 100%; height: 100%; display: block;">
            <path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 272a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
          </svg>
        `;
        
        const customOverlay = new window.kakao.maps.CustomOverlay({
          map: map,
          position: mouseEvent.latLng,
          content: content,
          yAnchor: 1, 
          xAnchor: 0.5,
          zIndex: 100
        });
        
        tempMarkerRef.current = customOverlay;
        
        setContextMenu({
          visible: true, latLng: mouseEvent.latLng, x: mouseEvent.point.x, y: mouseEvent.point.y
        });
      });

      // --- ★ (수정) 'click' 이벤트 ---
      window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
          // map 객체에 저장된 현재 로드뷰 모드를 읽어옴
          const currentMode = map.roadviewMode; 
          
          if (currentMode === 'PIN') {
              // 'PIN' 모드 (왼쪽 패널): 지도 클릭을 무시
              return; 
          } 
          
          if (currentMode === 'MAP') {
              // 'MAP' 모드 (우측 상단): 지도 클릭으로 로드뷰 위치 변경
              
              // ★ [수정] 컨텍스트 메뉴(카드 메뉴)를 닫기 위해 clearTempMarkerAndMenu() 호출
              clearTempMarkerAndMenu();
              
              const position = mouseEvent.latLng; 
              if (map.rvMarker) map.rvMarker.setPosition(position);
              if (map.toggleRoadview) map.toggleRoadview(position);
          } else { 
              // 'OFF' 모드: 기존의 지도 클릭 동작
              clearTempMarkerAndMenu();
              if (isListForcedRef.current) {
                  setIsListForced(false);
                  setListTitle("지도 내 매물");
                  handleMapMove(false); 
              }
              setActiveOverlayKey(null);
              setSelectedPin(null);
          }
      });
      // --- (수정 완료) ---
      
      mapContainer.addEventListener('contextmenu', handleContextMenu);

      fetchPins();
      fetchCustomers();

      // (로드뷰 마커 및 toggleRoadview 함수 ... 변경 없음)
      var markImage = new window.kakao.maps.MarkerImage(
          'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
          new window.kakao.maps.Size(26, 46),
          {
              spriteSize: new window.kakao.maps.Size(1666, 168),
              spriteOrigin: new window.kakao.maps.Point(705, 114),
              offset: new window.kakao.maps.Point(13, 46)
          }
      );
      var rvMarker = new window.kakao.maps.Marker({
          image : markImage,
          position: map.getCenter(),
          draggable: true,
          map: map
      });
      rvMarker.setVisible(false);
      
      window.kakao.maps.event.addListener(rvMarker, 'dragend', function() { 
          var position = rvMarker.getPosition();
          if (map.toggleRoadview) map.toggleRoadview(position);
      });

      function toggleRoadview(position){
          const roadviewClient = roadviewClientRef.current;
          const roadviewContainer = roadviewContainerRef.current;
          const mapDiv = mapRef.current;
          const rv = roadviewRef.current;

          if (!roadviewClient || !roadviewContainer || !mapDiv || !rv) return;

          roadviewClient.getNearestPanoId(position, 50, function(panoId) {
              if (panoId === null) {
                  roadviewContainer.classList.remove(styles.roadviewVisible); 
                  map.relayout();
              } else {
                  roadviewContainer.classList.add(styles.roadviewVisible); 
                  map.relayout();
                  
                  rv.setPanoId(panoId, position); 
                  rv.relayout();

                  const onPositionChanged = function() {
                      const rvPosition = rv.getPosition(); 
                      const panAngle = calculatePanAngle(rvPosition, position);
                      rv.setViewpoint({
                          pan: panAngle, 
                          tilt: 0       
                      });
                      window.kakao.maps.event.removeListener(rv, 'position_changed', onPositionChanged);
                  };
                  window.kakao.maps.event.addListener(rv, 'position_changed', onPositionChanged);
              }
          });
      }
      
      map.rvMarker = rvMarker;
      map.toggleRoadview = toggleRoadview;

    }, ["services", "clusterer"]); 

    return () => {
      if (mapRef.current) {
        mapRef.current.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [session]); // clearTempMarkerAndMenu를 의존성 배열에서 제거 (useCallback 미사용)

  
  // (idle 리스너 ... 변경 없음)
  useEffect(() => {
    // ... (이 코드는 제공된 파일에 생략되어 있습니다)
  }, [mapInstanceRef, handleMapMove]);


  // (지도 타입 변경 useEffect ... 변경 없음)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);

    if (activeMapType === 'SKYVIEW') {
      map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID); 
    } else if (activeMapType === 'CADASTRAL') {
      map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL); 
      map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT); 
    } else { // NORMAL
      map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL); 
    }
  }, [activeMapType, mapInstanceRef]); 

  // ★ [수정] 로드뷰 켜기/끄기 로직 (모드에 따라 분기)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const roadviewContainer = roadviewContainerRef.current;
    const roadviewClient = roadviewClientRef.current;
    const mapDiv = mapRef.current; 
    
    if (!window.kakao || !map || !roadviewContainer || !roadviewClient || !mapDiv) {
      if (roadviewMode !== 'OFF') {
        console.error("❌ [로드뷰 오류] 맵 객체들이 준비되지 않았습니다.");
        if (!roadviewClient) {
          alert("RoadviewClient 로드 실패. 'services' 라이브러리 활성화 상태를 확인하세요.");
          setRoadviewMode('OFF'); // 오류 시 모드 강제 끄기
        }
      }
      return;
    }

    // 로드뷰 객체 생성 (최초 1회)
    if (!roadviewRef.current) {
      roadviewRef.current = new window.kakao.maps.Roadview(roadviewContainer);
    }

    // ★ 맵 객체에 현재 모드 저장 (클릭 리스너가 참조할 수 있도록)
    map.roadviewMode = roadviewMode;

    if (roadviewMode !== 'OFF') {
      // --- 1. 로드뷰 켜기 ---
      console.log("✅ 로드뷰 켜기 실행 (모드:", roadviewMode, ")");
      
      // ★ [핵심] 모드에 따라 파란색 오버레이(로드뷰 선) 토글
      if (roadviewMode === 'MAP') {
          // 'MAP' 모드일 때만 파란색 선 표시
          map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      } else {
          // 'PIN' 모드일 때는 파란색 선 제거
          map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      }
      
      // ★ [수정] mapHidden 클래스 관련 로직 모두 제거 ★
      
      if (map.rvMarker) map.rvMarker.setVisible(true); // 마커는 항상 표시
      
      let position;
      if (selectedPin && selectedPin.lat) {
        position = new window.kakao.maps.LatLng(selectedPin.lat, selectedPin.lng);
      } else {
        position = map.getCenter();
      }
      
      if (map.rvMarker) map.rvMarker.setPosition(position);
      
      if (map.toggleRoadview) {
        map.toggleRoadview(position); // 로드뷰 이미지 띄우기
      }

    } else {
      // --- 2. 로드뷰 끄기 ---
      console.log("✅ 로드뷰 끄기 실행");

      // ★ [핵심] 파란색 오버레이 항상 끄기
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      
      // ★ [수정] mapHidden 클래스 관련 로직 모두 제거 ★
      
      if (map.rvMarker) map.rvMarker.setVisible(false);

      if (roadviewContainer) { 
        roadviewContainer.classList.remove(styles.roadviewVisible); // 로드뷰 이미지 숨기기
      }
      map.relayout();
    }
  }, [roadviewMode, selectedPin, mapInstanceRef, setRoadviewMode]); // ★ 의존성 변경


  return (
    <section className={styles.mapSection}>
      {/* 지도 Div */}
      <div 
        ref={mapRef} 
        className={styles.map} 
      >
        {!window.kakao.maps && (
          <div className={styles.mapError}>
            카카오맵 로딩 실패. (API 키, 도메인 등록, 광고 차단기 확인)
          </div>
        )}
      </div>

      {/* 로드뷰 Div */}
      <div
        ref={roadviewContainerRef}
        className={styles.roadview} 
      />
    </section>
  );
}