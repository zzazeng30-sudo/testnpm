/**
 * [Revision: 55.1]
 * - 초기 로딩 시 '매물(Pins) 중심 좌표'를 최우선으로 설정하는 로직 추가
 * - Pins 데이터 비동기 로딩을 고려하여 별도의 useEffect로 중심 이동 처리
 * - 매물이 없을 경우 기존 로직(마이페이지 주소 -> 온양온천역)으로 Fallback
 */
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { supabase } from '../../../../0005_Lib/supabaseClient';

const KAKAO_APP_KEY = "c493060c5720050dfb0b923762ae3423";
const WALKER_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%232563eb' stroke='white' stroke-width='4'/%3E%3Cpath d='M50 15 L80 75 L50 60 L20 75 Z' fill='white'/%3E%3C/svg%3E`;
const RED_PIN_SVG = `data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' fill='%23ef4444' stroke='white' stroke-width='1.5'/%3E%3Ccircle cx='12' cy='9' r='2.5' fill='white'/%3E%3C/svg%3E`;

export default function KakaoMap() {
  const { 
    mapRef, mapInstanceRef, setIsMapReady, updateMapState, 
    resetSelection, onMapRightClick, 
    isRoadviewMode, setRoadviewPosition, roadviewPosition, roadviewHeading,
    rightClickPin,
    pins, // ★ [추가] 매물 목록을 Context에서 가져옴
    isMapReady // 지도 준비 상태 확인용
  } = useMap();

  const rvClientRef = useRef(null);
  const walkerRef = useRef(null); 
  const rightClickMarkerRef = useRef(null); 
  
  // ★ [추가] 초기 자동 중심 이동이 수행되었는지 추적하는 Ref
  const hasAutoCentered = useRef(false);

  const handlersRef = useRef({ isRoadviewMode, setRoadviewPosition, resetSelection });

  useEffect(() => {
    handlersRef.current = { isRoadviewMode, setRoadviewPosition, resetSelection };
  }, [isRoadviewMode, setRoadviewPosition, resetSelection]);

  // 1. 지도 초기화 및 기본 위치(Supabase 주소 or 온양온천역) 설정
  useEffect(() => {
    const scriptId = 'kakao-map-script';

    const onLoad = () => {
      window.kakao.maps.load(async () => {
        if (!mapRef.current) return;
        
        // 기본값: 온양온천역
        let centerLat = 36.7805; 
        let centerLng = 127.0034; 

        try {
          // 로그인 유저 정보 및 프로필 주소 가져오기 (매물이 로딩되기 전 기본 위치)
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('address')
              .eq('id', user.id)
              .single();

            if (profile?.address) {
              const geocoder = new window.kakao.maps.services.Geocoder();
              
              const coords = await new Promise((resolve) => {
                geocoder.addressSearch(profile.address, (result, status) => {
                  if (status === window.kakao.maps.services.Status.OK) {
                    resolve({ lat: Number(result[0].y), lng: Number(result[0].x) });
                  } else {
                    resolve(null);
                  }
                });
              });

              if (coords) {
                centerLat = coords.lat;
                centerLng = coords.lng;
              }
            }
          }
        } catch (error) {
          console.error("초기 위치 설정 중 오류:", error);
        }

        // 지도 생성 (일단 구해진 주소로 생성)
        const map = new window.kakao.maps.Map(mapRef.current, {
          center: new window.kakao.maps.LatLng(centerLat, centerLng),
          level: 4,
        });
        mapInstanceRef.current = map;
        
        rvClientRef.current = new window.kakao.maps.RoadviewClient();
        
        // 이벤트 리스너 등록
        const handleClick = (mouseEvent) => {
          const { isRoadviewMode, setRoadviewPosition, resetSelection } = handlersRef.current;
          
          if (isRoadviewMode) {
            const position = mouseEvent.latLng;
            rvClientRef.current.getNearestPanoId(position, 50, (panoId) => {
              if (panoId) {
                setRoadviewPosition({ 
                  lat: position.getLat(), 
                  lng: position.getLng(), 
                  panoId 
                });
              } else {
                console.warn("이 지점은 로드뷰를 지원하지 않습니다.");
              }
            });
          } else {
            resetSelection();
          }
        };

        const handleRightClick = (mouseEvent) => {
          const { isRoadviewMode } = handlersRef.current;
          if (!isRoadviewMode) {
            onMapRightClick({ latLng: mouseEvent.latLng, point: mouseEvent.point });
          }
        };

        const handleDragStart = () => {
          if (window.innerWidth <= 768) {
            const { resetSelection } = handlersRef.current;
            resetSelection();
          }
        };

        window.kakao.maps.event.addListener(map, 'click', handleClick);
        window.kakao.maps.event.addListener(map, 'rightclick', handleRightClick);
        window.kakao.maps.event.addListener(map, 'dragstart', handleDragStart);
        window.kakao.maps.event.addListener(map, 'zoom_changed', () => updateMapState());
        window.kakao.maps.event.addListener(map, 'idle', () => updateMapState());

        setIsMapReady(true);
        updateMapState(); 
      });
    };

    if (window.kakao && window.kakao.maps) { onLoad(); }
    else {
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services,clusterer&autoload=false`;
        script.onload = onLoad;
        document.head.appendChild(script);
      }
    }
  }, []);

  // ★ [추가] 매물 데이터(pins)가 로딩되면 해당 중심 좌표로 이동 (Priority 1)
  useEffect(() => {
    // 지도가 준비되지 않았거나, 매물이 없거나, 이미 자동 이동을 했다면 중단
    if (!isMapReady || !mapInstanceRef.current || !pins || pins.length === 0) return;
    if (hasAutoCentered.current) return;

    const validPins = pins.filter(p => p.lat && p.lng);
    
    if (validPins.length > 0) {
      // 평균 좌표 계산
      const sumLat = validPins.reduce((sum, p) => sum + parseFloat(p.lat), 0);
      const sumLng = validPins.reduce((sum, p) => sum + parseFloat(p.lng), 0);
      const centerLat = sumLat / validPins.length;
      const centerLng = sumLng / validPins.length;

      // 지도를 매물 중심으로 부드럽게 이동
      const moveLatLng = new window.kakao.maps.LatLng(centerLat, centerLng);
      mapInstanceRef.current.setCenter(moveLatLng); 
      
      console.log("매물 데이터 로딩 완료: 중심 좌표로 이동합니다.", centerLat, centerLng);
      
      // 이동 완료 플래그 설정 (이후에는 유저가 자유롭게 이동)
      hasAutoCentered.current = true;
    }
  }, [isMapReady, pins]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    if (isRoadviewMode) {
      map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      map.setCursor('crosshair');
    } else {
      map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.ROADVIEW);
      map.setCursor('move');
      if (walkerRef.current) {
        walkerRef.current.setMap(null);
        walkerRef.current = null;
      }
    }
  }, [isRoadviewMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao || !isRoadviewMode || !roadviewPosition) return;

    const position = new window.kakao.maps.LatLng(roadviewPosition.lat, roadviewPosition.lng);
    if (!walkerRef.current) {
      const content = document.createElement('div');
      content.style.cssText = `width:40px;height:40px;background-image:url("${WALKER_SVG}");background-size:contain;position:absolute;transform-origin:50% 50%;`;
      walkerRef.current = new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 0.5, zIndex: 9999 });
      walkerRef.current.setMap(map);
    }
    walkerRef.current.setPosition(position);
    const el = walkerRef.current.getContent();
    if (el) el.style.transform = `rotate(${roadviewHeading}deg)`;
  }, [isRoadviewMode, roadviewPosition, roadviewHeading]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;
    if (rightClickMarkerRef.current) rightClickMarkerRef.current.setMap(null);

    if (rightClickPin) {
      const position = new window.kakao.maps.LatLng(rightClickPin.lat, rightClickPin.lng);
      const content = document.createElement('div');
      content.style.cssText = `width:32px;height:32px;background-image:url("${RED_PIN_SVG}");background-size:contain;`;
      rightClickMarkerRef.current = new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 1, zIndex: 9998 });
      rightClickMarkerRef.current.setMap(map);
    }
  }, [rightClickPin]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}