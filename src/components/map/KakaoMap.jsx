import React, { useEffect, useRef } from 'react';
import { useMap } from '../../contexts/MapContext';
import { supabase } from '../../lib/supabaseClient';
import styles from '../../features/map/pages/MapPage.module.css';

export default function KakaoMap() {
  const {
    session, mapInstanceRef, tempMarkerRef, clearTempMarkerAndMenu, setSelectedPin, setContextMenu,
    fetchPins, fetchCustomers, mapRef, activeMapType, roadviewMode, handleMapMove, isListForced, 
    clustererRef, 
    setIsListForced, setListTitle, setActiveOverlayKey, setIsMapReady, drawMarkers, pins,
    selectedPin, // 단일 매물 정보
    visiblePins  // ★ [추가] 현재 리스트에 보이는 매물들 (스택 정보 포함)
  } = useMap();

  const roadviewContainerRef = useRef(null);
  const roadviewClientRef = useRef(null); 
  const roadviewRef = useRef(null);       
  const walkerOverlayRef = useRef(null); 

  const isListForcedRef = useRef(isListForced);
  useEffect(() => { isListForcedRef.current = isListForced; }, [isListForced]);

  const getInitialCenter = (geocoder, defaultCenter) => {
    return new Promise(async (resolve) => {
      if (!session || !session.user) { resolve(defaultCenter); return; }
      try {
        const { data: profile, error } = await supabase.from('profiles').select('address').eq('id', session.user.id).single();
        if (error || !profile || !profile.address) { resolve(defaultCenter); return; }
        geocoder.addressSearch(profile.address, (result, status) => {
          if (status === window.kakao.maps.services.Status.OK) resolve(new window.kakao.maps.LatLng(result[0].y, result[0].x));
          else resolve(defaultCenter);
        });
      } catch (e) { resolve(defaultCenter); }
    });
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const handleContextMenu = (e) => e.preventDefault();
    mapRef.current.addEventListener('contextmenu', handleContextMenu);

    window.kakao.maps.load(async () => {
      const mapContainer = mapRef.current;
      const DEFAULT_CENTER = new window.kakao.maps.LatLng(37.566826, 126.9786567);
      const DEFAULT_ZOOM = 4;

      if (!window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        mapInstanceRef.current = new window.kakao.maps.Map(mapContainer, { center: DEFAULT_CENTER, level: DEFAULT_ZOOM });
      } else {
        const geocoder = new window.kakao.maps.services.Geocoder();
        const initialCenter = await getInitialCenter(geocoder, DEFAULT_CENTER);
        mapInstanceRef.current = new window.kakao.maps.Map(mapContainer, { center: initialCenter, level: DEFAULT_ZOOM, draggable: true, scrollwheel: true });
      }
      const map = mapInstanceRef.current;
      
      if (window.kakao.maps.MarkerClusterer && clustererRef) {
        clustererRef.current = new window.kakao.maps.MarkerClusterer({ map: map, averageCenter: true, minLevel: 3 });
      }
      
      // --- 로드뷰 초기화 ---
      if (window.kakao.maps.RoadviewClient && window.kakao.maps.Roadview) {
        roadviewClientRef.current = new window.kakao.maps.RoadviewClient();
        roadviewRef.current = new window.kakao.maps.Roadview(roadviewContainerRef.current);

        // 로드뷰 로봇(MapWalker) 생성
        const walkerContent = document.createElement('div');
        walkerContent.className = styles.mapWalker;
        walkerOverlayRef.current = new window.kakao.maps.CustomOverlay({
            position: map.getCenter(),
            content: walkerContent,
            yAnchor: 1
        });

        // 로드뷰 이벤트 리스너
        const rv = roadviewRef.current;
        
        window.kakao.maps.event.addListener(rv, 'position_changed', () => {
            const rvPosition = rv.getPosition();
            map.setCenter(rvPosition); 
            walkerOverlayRef.current.setPosition(rvPosition);
        });

        window.kakao.maps.event.addListener(rv, 'viewpoint_changed', () => {
            const viewpoint = rv.getViewpoint();
            walkerContent.style.transform = `rotate(${viewpoint.pan}deg)`;
        });
      }

      // 지도 클릭 시 로드뷰 이동 함수
      map.toggleRoadview = (position) => {
          if (!roadviewClientRef.current || !roadviewRef.current) return;
          roadviewClientRef.current.getNearestPanoId(position, 50, (panoId) => {
              if (panoId) {
                  roadviewRef.current.setPanoId(panoId, position); 
              }
          });
      };

      // 배경 우클릭
      window.kakao.maps.event.addListener(map, 'rightclick', (mouseEvent) => {
        clearTempMarkerAndMenu();
        setSelectedPin(null);
        const content = document.createElement('div');
        content.className = styles.tempPin; 
        content.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="fill: #DC2626; width: 100%; height: 100%; display: block;"><path d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0zM192 272a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg>`;
        const customOverlay = new window.kakao.maps.CustomOverlay({ map: map, position: mouseEvent.latLng, content: content, yAnchor: 1, xAnchor: 0.5, zIndex: 100 });
        tempMarkerRef.current = customOverlay;
        setContextMenu({ visible: true, latLng: mouseEvent.latLng, x: mouseEvent.point.x, y: mouseEvent.point.y, pinId: null });
      });

      // 좌클릭
      window.kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
          const currentMode = map.roadviewMode; 
          if (currentMode === 'PIN') return; 
          
          if (currentMode === 'MAP') {
              clearTempMarkerAndMenu();
              const position = mouseEvent.latLng;
              if (map.toggleRoadview) map.toggleRoadview(position);
          } else {
              clearTempMarkerAndMenu();
              setIsListForced(false);
              setListTitle("지도 내 매물");
              handleMapMove(false); 
              setActiveOverlayKey(null);
              setSelectedPin(null);
          }
      });

      await fetchPins();
      if (fetchCustomers) fetchCustomers();
      setIsMapReady(true);

    }, ["services", "clusterer"]); 

    return () => { if (mapRef.current) mapRef.current.removeEventListener('contextmenu', handleContextMenu); };
  }, [session]); 

  useEffect(() => {
    if (!mapInstanceRef.current || !handleMapMove) return;
    const map = mapInstanceRef.current;
    const onIdle = () => handleMapMove(false);
    window.kakao.maps.event.addListener(map, 'idle', onIdle);
    return () => window.kakao.maps.event.removeListener(map, 'idle', onIdle);
  }, [mapInstanceRef.current, handleMapMove]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
    if (activeMapType === 'SKYVIEW') map.setMapTypeId(window.kakao.maps.MapTypeId.HYBRID); 
    else if (activeMapType === 'CADASTRAL') { map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL); map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT); } 
    else map.setMapTypeId(window.kakao.maps.MapTypeId.NORMAL); 
  }, [activeMapType]);

  // 로드뷰 모드 변경 감지 (MAP / PIN / OFF)
  useEffect(() => {
      const map = mapInstanceRef.current;
      if(!map || !window.kakao) return;
      map.roadviewMode = roadviewMode;
      
      const rvClient = roadviewClientRef.current;
      const rvViewer = roadviewRef.current;
      const walker = walkerOverlayRef.current;

      if (roadviewMode === 'MAP' || roadviewMode === 'PIN') {
          if (rvViewer) {
              setTimeout(() => rvViewer.relayout(), 100);
          }
          if (walker) walker.setMap(map);

          let targetPosition = null;

          // [A] PIN 모드 (매물 보기 버튼)
          if (roadviewMode === 'PIN') {
              map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW); 
              
              if (selectedPin) {
                  // 단일 매물인 경우
                  targetPosition = new window.kakao.maps.LatLng(selectedPin.lat, selectedPin.lng);
              } else if (isListForced && visiblePins && visiblePins.length > 0) {
                  // ★ [추가] 스택(묶음) 매물인 경우: 리스트의 첫 번째 항목(헤더) 위치 사용
                  const target = visiblePins[0];
                  targetPosition = new window.kakao.maps.LatLng(target.lat, target.lng);
              }
          } 
          // [B] MAP 모드 (지도 우측 상단 버튼)
          else if (roadviewMode === 'MAP') {
              map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
              targetPosition = map.getCenter(); 
          }

          // 로드뷰 이동 실행
          if (targetPosition && rvClient && rvViewer) {
              rvClient.getNearestPanoId(targetPosition, 50, (panoId) => {
                  if (panoId) {
                      rvViewer.setPanoId(panoId, targetPosition);
                      if (walker) walker.setPosition(targetPosition);
                  } else {
                      if (walker) walker.setPosition(targetPosition);
                  }
              });
          }

      } else {
          map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
          if (walker) walker.setMap(null);
      }

  }, [roadviewMode, selectedPin, visiblePins, isListForced]); // 의존성 추가

  return (
    <section className={styles.mapSection}>
      <div ref={mapRef} className={styles.map}>
        {!window.kakao.maps && <div className={styles.mapError}>카카오맵 로딩 실패</div>}
      </div>
      
      <div 
        ref={roadviewContainerRef} 
        className={`${styles.roadview} ${roadviewMode !== 'OFF' ? styles.roadviewVisible : ''}`} 
        style={{ backgroundColor: '#333' }} 
      />
    </section>
  );
}