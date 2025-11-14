// src/components/map/KakaoMap.jsx (변경 없음)
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../contexts/MapContext';
import { supabase } from '../../supabaseClient.js';
import styles from '../../MapPage.module.css';

// --- ★ 1. 디바운스(Debounce) 헬퍼 함수 ---
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
    handleBoundsChanged, 
  } = useMap();

  const roadviewControlRef = useRef(null);

  // 5. (Init) 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;

    const handleContextMenu = (e) => e.preventDefault();
    const mapContainer = mapRef.current;

    // (getInitialCenter 헬퍼 함수... 변경 없음)
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
      if (!mapContainer) return;

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
      
      if (window.kakao.maps.RoadviewControl) {
        roadviewControlRef.current = new window.kakao.maps.RoadviewControl();
      } else {
        console.error("❌ [진단] RoadviewControl 라이브러리가 로드되지 않았습니다.");
      }

      // ('rightclick' 이벤트... 변경 없음)
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

      // ('click' 이벤트... 변경 없음)
      window.kakao.maps.event.addListener(map, 'click', () => {
        clearTempMarkerAndMenu();
      });

      // --- 'bounds_changed' 리스너 제거 ---
      
      mapContainer.addEventListener('contextmenu', handleContextMenu);

      fetchPins();
      fetchCustomers();
    });

    return () => {
      if (mapContainer) {
        mapContainer.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [session]); 

  
  // --- ★ 'bounds_changed' 리스너를 위한 별도 useEffect (디바운싱 적용) ---
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !handleBoundsChanged) {
      return;
    }
    
    // 200ms(0.2초) 딜레이로 디바운스 핸들러 생성
    const debouncedHandler = debounce(handleBoundsChanged, 200);

    const listener = window.kakao.maps.event.addListener(
      map, 
      'bounds_changed', 
      debouncedHandler
    );

    return () => {
      // ★ (수정) 리스너 객체를 사용하여 정확하게 제거
      if (listener) {
        listener.remove();
      }
    };
  }, [mapInstanceRef, handleBoundsChanged]); 
  // --- (여기까지) ---


  // (지도 타입 토글... 변경 없음)
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

  // (로드뷰 컨트롤 토글... 변경 없음)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !roadviewControlRef.current) return; 

    if (showRoadview) {
      map.addControl(roadviewControlRef.current, window.kakao.maps.ControlPosition.TOPRIGHT);
    } else {
      map.removeControl(roadviewControlRef.current);
    }
  }, [showRoadview, mapInstanceRef]);


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