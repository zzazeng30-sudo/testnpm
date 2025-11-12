// src/components/map/KakaoMap.jsx (수정)
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../contexts/MapContext'; 
import { supabase } from '../../supabaseClient.js';
import styles from '../../MapPage.module.css'; 

const GRAY_PIN_IMAGE_URL = 'https://placehold.co/36x36/888888/ffffff';

export default function KakaoMap() {
  const {
    session,
    mapInstanceRef,
    tempMarkerRef,
    clearTempMarkerAndMenu,
    setSelectedPin,
    setContextMenu,
    contextMenu, 
    fetchPins,
    fetchCustomers,
    mapRef,
    // ★ (추가) 지도 컨트롤 state
    mapType,
    showCadastral,
    showRoadview
  } = useMap();
  
  // ★ (추가) 로드뷰 컨트롤러 인스턴스를 저장할 Ref
  const roadviewControlRef = useRef(null);

  // 5. (Init) 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleContextMenu = (e) => e.preventDefault();
    const mapContainer = mapRef.current; 

    // 'getInitialCenter' 헬퍼 함수
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

        // ★ (수정) 기본 컨트롤들 모두 제거
        // map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);
        
        // ★ (수정) 로드뷰 컨트롤러를 생성만 하고, Ref에 저장 (아직 지도에 추가 안 함)
        if (window.kakao.maps.RoadviewControl) {
            roadviewControlRef.current = new window.kakao.maps.RoadviewControl();
        } else {
            console.error("❌ [진단] RoadviewControl 라이브러리가 로드되지 않았습니다.");
        }

        // 'rightclick' 이벤트 
        window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
            clearTempMarkerAndMenu();
            setSelectedPin(null);
            const imageSize = new window.kakao.maps.Size(36, 36);
            const grayMarkerImage = new window.kakao.maps.MarkerImage(GRAY_PIN_IMAGE_URL, imageSize);
            const marker = new window.kakao.maps.Marker({
                map: map, position: mouseEvent.latLng, image: grayMarkerImage
            });
            tempMarkerRef.current = marker; 
            setContextMenu({
                visible: true, latLng: mouseEvent.latLng, x: mouseEvent.point.x, y: mouseEvent.point.y    
            });
        });
        
        // 'click' 이벤트 
        window.kakao.maps.event.addListener(map, 'click', () => {
            if (contextMenu.visible) {
                clearTempMarkerAndMenu(); 
            }
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
  }, [session]); 

  // ★ (수정) 지도 타입(지도/스카이뷰) + 지적도 레이어 토글을 위한 useEffect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao.maps.MapTypeId) return;

    // 1. 지도/스카이뷰 변경
    if (mapType === 'SKYVIEW') {
        map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID);
    } else {
        map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL);
    }

    // 2. 지적도 변경
    if (showCadastral) {
        map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    } else {
        map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    }
  }, [mapType, showCadastral, mapInstanceRef]); // 3가지 state가 바뀔 때마다 실행

  // ★ (추가) 로드뷰 컨트롤 토글을 위한 useEffect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !roadviewControlRef.current) return; // map과 컨트롤러가 준비되었는지 확인

    if (showRoadview) {
        // 로드뷰 켜기
        map.addControl(roadviewControlRef.current, window.kakao.maps.ControlPosition.TOPRIGHT);
    } else {
        // 로드뷰 끄기
        map.removeControl(roadviewControlRef.current);
    }
  }, [showRoadview, mapInstanceRef]); // showRoadview 상태가 바뀔 때마다 실행


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