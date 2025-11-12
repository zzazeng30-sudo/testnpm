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
    fetchPins,
    fetchCustomers,
    mapRef // ★ 21일차 (수정): '뇌'로부터 mapRef를 받음
  } = useMap();
  
  // const mapRef = useRef(null); // ★ 21일차 (수정): '뇌'의 것을 사용하므로 제거

  // 5. (Init) 지도 초기화
  useEffect(() => {
    if (!mapRef.current) return;
    
    const handleContextMenu = (e) => e.preventDefault();
    const mapContainer = mapRef.current; // ★ '뇌'에서 받은 ref 사용

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
            clearTempMarkerAndMenu(); 
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
  }, [session]); // session이 로드되면(또는 바뀌면) 지도를 리로드

  return (
    <section className={styles.mapSection}>
      {/* ★ 21일차 (수정): '뇌'에서 받은 mapRef를 div에 연결 */}
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