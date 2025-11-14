// src/components/map/KakaoMap.jsx (수정)
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../contexts/MapContext';
import { supabase } from '../../supabaseClient.js';
import styles from '../../MapPage.module.css';

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
    showRoadview,
    
    // ★ (수정) handleBoundsChanged -> handleMapMove
    handleMapMove, 
    
    isListForced, // ★ (추가) 리스트 강제 상태
    
    clustererRef // ★ (추가) 클러스터러 Ref
  } = useMap();

  // ★ (핵심 수정) roadviewControlRef를 KakaoMap 컴포넌트가 직접 소유
  const roadviewControlRef = useRef(null);

  // 5. (Init) 지도 초기화
  useEffect(() => {
    // ★ (추가) mapRef.current가 없으면 즉시 중단
    if (!mapRef.current) return;

    const handleContextMenu = (e) => e.preventDefault();
    // ★ (수정) mapContainer 변수를 콜백 내부에서 선언하도록 이동
    // const mapContainer = mapRef.current; 

    // (getInitialCenter 헬퍼 함수)
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
    // ★ (수정) 'clusterer' 라이브러리 추가
    window.kakao.maps.load(async () => {
      
      // ★ (핵심 수정) 콜백 함수 시점의 mapRef.current를 사용
      const mapContainer = mapRef.current;
      if (!mapContainer) {
        // 컴포넌트가 언마운트되었으면 중단
        return;
      }

      const DEFAULT_CENTER = new window.kakao.maps.LatLng(37.566826, 126.9786567);
      const DEFAULT_ZOOM = 4;

      if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        console.error("❌ [진단] Geocoder 서비스 로드 실패. 기본 위치로 시작.");
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
      
      // --- ★ (추가) MarkerClusterer 생성 ---
      if (window.kakao.maps.MarkerClusterer) {
        clustererRef.current = new window.kakao.maps.MarkerClusterer({
            map: map, // 맵 객체
            averageCenter: true, // 클러스터 마커의 위치를 중심(좌표 평균)으로 설정
            minLevel: 6, // 클러스터할 최소 지도 레벨 (숫자가 클수록 많이 줌인)
        });
      } else {
        console.error("❌ [진단] MarkerClusterer 라이브러리 로드 실패.");
      }
      // --- (여기까지) ---
      
      if (window.kakao.maps.RoadviewControl) {
        // ★ (수정) 로컬 ref에 할당
        roadviewControlRef.current = new window.kakao.maps.RoadviewControl();
      } else {
        console.error("❌ [진단] RoadviewControl 라이브러리가 로드되지 않았습니다.");
      }

      // ('rightclick' 이벤트)
      window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
        clearTempMarkerAndMenu();
        setSelectedPin(null);
        
        const content = document.createElement('div');
        content.className = styles.tempPin; 
        content.innerHTML = `
          <svg
            width="14"
            height="32.5"
            viewBox="0 0 28 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 27.8549C21.732 27.8549 28 21.6193 28 13.9274C28 6.23552 21.732 0 14 0C6.26801 0 0 6.23552 0 13.9274C0 21.6193 6.26801 27.8549 14 27.8549Z"
              fill="#E71F19"
            />
            <path
              d="M9.45117 31.5678V57.1758L14.0004 65L18.5496 57.1758V31.5678C17.156 32.1414 15.6182 32.4602 14.0004 32.4602C12.3825 32.4602 10.8608 32.1414 9.45117 31.5678Z"
              fill="#000000"
            />
          </svg>
        `;

        const customOverlay = new window.kakao.maps.CustomOverlay({
          map: map,
          position: mouseEvent.latLng,
          content: content,
          yAnchor: 1, 
          xAnchor: 0.5
        });
        
        tempMarkerRef.current = customOverlay;
        
        setContextMenu({
          visible: true, latLng: mouseEvent.latLng, x: mouseEvent.point.x, y: mouseEvent.point.y
        });
      });

      // ('click' 이벤트)
      window.kakao.maps.event.addListener(map, 'click', () => {
        clearTempMarkerAndMenu();
      });
      
      // ★ (수정) mapContainer에 이벤트 리스너 추가
      mapContainer.addEventListener('contextmenu', handleContextMenu);

      fetchPins();
      fetchCustomers();
      
    }, ["services", "clusterer"]); 

    return () => {
      // ★ (수정) 클린업 함수에서 mapRef.current 확인
      if (mapRef.current) {
        mapRef.current.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [session]); // session 의존성 유지

  
  // --- ★ (수정) 'bounds_changed' 리스너 ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !handleMapMove) {
      return;
    }
    
    const debouncedHandler = debounce(() => {
        handleMapMove(isListForced); 
    }, 200);

    const listener = window.kakao.maps.event.addListener(
      map, 
      'bounds_changed', // 줌 변경과 이동을 모두 감지
      debouncedHandler
    );

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [mapInstanceRef, handleMapMove, isListForced]); 
  // --- (여기까지) ---


  // (지도 타입 토글)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao.maps.MapTypeId) return;

    if (activeMapType === 'SKYVIEW') {
      map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID);
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    } 
    else if (activeMapType === 'CADASTRAL') {
      map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL); 
      map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT); 
    } 
    else {
      map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL);
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    }
  }, [activeMapType, mapInstanceRef]); 

  // (로드뷰 컨트롤 토글)
  useEffect(() => {
    const map = mapInstanceRef.current;
    // ★ (수정) 로컬 ref 확인
    if (!map || !roadviewControlRef.current) return; 

    if (showRoadview) {
      map.addControl(roadviewControlRef.current, window.kakao.maps.ControlPosition.TOPRIGHT);
    } else {
      map.removeControl(roadviewControlRef.current);
    }
  }, [showRoadview, mapInstanceRef]); // ★ roadviewControlRef는 의존성 배열에서 제거


  return (
    <section className={styles.mapSection}>
      <div ref={mapRef} className={styles.map}>
        {!window.kakao.maps && (
          <div className={styles.mapError}>
            카카오맵 로딩 실패. (API 키, 도메인 등록, 광고 차단기 확인)
          </div>
        )}
      </div>
    </section>
  );
}