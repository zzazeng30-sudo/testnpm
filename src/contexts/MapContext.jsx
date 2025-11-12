// src/contexts/MapContext.jsx (수정)
import React, { createContext, useContext, useState, useRef } from 'react';
import { supabase } from '../supabaseClient.js';

// (API 설정, 헬퍼 함수 등은 100% 동일)
const API_MODEL = 'gemini-2.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY"; 
const PIN_IMAGE_URL = 'https://placehold.co/36x36/007bff/ffffff?text=P';
const GRAY_PIN_IMAGE_URL = 'https://placehold.co/36x36/888888/ffffff';

const exponentialBackoffFetch = async (url, options, maxRetries = 5) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// 1. 'MapContext'라는 이름의 '데이터 창구'를 만듭니다.
const MapContext = createContext();

// 2. 다른 컴포넌트가 이 '창구'를 쉽게 사용하도록 'useMap' 훅을 만듭니다.
export function useMap() {
  return useContext(MapContext);
}

// 3. '뇌' 역할을 하는 'MapProvider' 컴포넌트를 만듭니다.
export function MapProvider({ children, session, mode }) {
  // --- State ---
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [editMemo, setEditMemo] = useState('');
  const [editPrice, setEditPrice] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [linkedCustomers, setLinkedCustomers] = useState([]);
  const [imContent, setImContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourPins, setTourPins] = useState([]);
  const [routeLine, setRouteLine] = useState(null);
  const [contextMenu, setContextMenu] = useState({ 
    visible: false, latLng: null, x: 0, y: 0
  });

  // --- Refs ---
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const contextMenuRef = useRef(null);
  // ★ 21일차 (수정): '뇌'가 지도 div ref를 생성
  const mapRef = useRef(null); 

  // --- Handlers (MapPage.jsx에서 그대로 복사) ---
  
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
  
  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (error) console.error('고객 리스트 로드 오류:', error.message);
    else setCustomers(data || []);
  };

  const fetchLinkedCustomers = async (pinId) => {
    if (!pinId) { setLinkedCustomers([]); return; }
    const { data, error } = await supabase.from('customer_pins').select(` id, customer:customers ( id, name ) `).eq('pin_id', pinId);
    if (error) console.error('연결된 고객 로드 오류:', error.message);
    else setLinkedCustomers(data || []);
  };
  
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
            clearTempMarkerAndMenu(); 
            setSelectedPin(pin);
            setEditMemo(pin.memo || '');
            setEditPrice(pin.price || 0);
            fetchLinkedCustomers(pin.id);
            setImContent(null); 
        });
        markersRef.current[pin.id] = marker;
    });
  };
  
  const clearTempMarkerAndMenu = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null; 
    }
    setContextMenu({ visible: false, latLng: null, x: 0, y: 0 });
    if (selectedPin && !selectedPin.id) {
        setSelectedPin(null);
    }
  };
  
  const handleCreatePin = async (newPinData) => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').insert(newPinData).select(); 
    if (error) {
        console.error('핀 생성 오류:', error.message);
        setLoading(false);
    } else {
      const createdPin = data[0];
      clearTempMarkerAndMenu(); 
      await fetchPins(); 
      setSelectedPin(createdPin);
      setEditMemo(createdPin.memo || '');
      setEditPrice(createdPin.price || 0);
      fetchLinkedCustomers(createdPin.id); 
      setImContent(null);
    }
  };

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

  const handleUpdatePin = async (pinId) => {
    setLoading(true);
    const updatedData = { 
        memo: editMemo, 
        price: Number(editPrice), 
        user_id: session.user.id
    };
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
  
  const handleUnlinkCustomer = async (linkId) => {
    setLoading(true);
    const { error } = await supabase.from('customer_pins').delete().eq('id', linkId);
    if (error) console.error('고객 연결 해제 오류:', error.message);
    else setLinkedCustomers(currentLinks => currentLinks.filter(link => link.id !== linkId));
    setLoading(false);
  };

  const searchNearby = (ps, keyword, lat, lng) => {
    return new Promise((resolve) => {
      const options = {
        location: new window.kakao.maps.LatLng(lat, lng),
        radius: 3000, 
        sort: window.kakao.maps.services.SortBy.DISTANCE, 
        size: 5 
      };
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          resolve(data.map(place => place.place_name));
        } else {
          resolve([]); 
        }
      }, options);
    });
  };

  const handleGenerateIm = async (pin) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setLoading(true); 
    setImContent(null);
    if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Places) {
      setImContent("카카오맵 'Places' 라이브러리 로드 실패.");
      setIsGenerating(false); setLoading(false); return;
    }
    let realData = ""; 
    try {
      const ps = new window.kakao.maps.services.Places();
      const [schools, marts, hospitals, subways] = await Promise.all([
        searchNearby(ps, '학교', pin.lat, pin.lng),
        searchNearby(ps, '대형마트', pin.lat, pin.lng),
        searchNearby(ps, '병원', pin.lat, pin.lng),
        searchNearby(ps, '지하철역', pin.lat, pin.lng)
      ]);
      realData = `[교육] ${schools.join(', ')} [마트] ${marts.join(', ')} [병원] ${hospitals.join(', ')} [교통] ${subways.join(', ')}`;
    } catch (searchError) { realData = "[데이터 로드 실패]"; }
    const systemPrompt = `당신은 숙련된 부동산 입지 분석가입니다... (이하 생략)`;
    const userQuery = `다음은 매물(좌표: ${pin.lat}, ${pin.lng}) 3km 이내 '실제 시설 목록'입니다. 이 데이터를 바탕으로 브리핑 리포트를 작성해 주세요. \n--- \n ${realData} \n--- \n 리포트:`;
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] }, 
      contents: [{ role: 'user', parts: [{ text: userQuery }] }],
    };
    if (!API_KEY) { /* ... (API 키 없음 처리) ... */ }
    try {
      const response = await exponentialBackoffFetch(
        `${API_URL}${API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) setImContent(generatedText);
      else setImContent("AI 요약 리포트 생성 실패.");
    } catch (error) { setImContent(`AI 리포트 생성 오류: ${error.message}`);
    } finally {
      setIsGenerating(false); setLoading(false); 
    }
  };

  const handleAddToTour = (pinToAdd) => {
    if (!pinToAdd) return;
    if (tourPins.find(p => p.id === pinToAdd.id)) {
      alert("이미 임장 목록에 추가된 매물입니다.");
      return;
    }
    setTourPins(prev => [...prev, pinToAdd]);
    setSelectedPin(null); 
  };
  
  const handleRemoveFromTour = (pinId) => {
    setTourPins(prev => prev.filter(p => p.id !== pinId));
    if (routeLine) {
        routeLine.setMap(null);
        setRouteLine(null);
    }
  };

  const handleClearTour = () => {
    setTourPins([]);
    if (routeLine) {
        routeLine.setMap(null);
        setRouteLine(null);
    }
  };

  const handleOptimizeTour = async () => {
    if (tourPins.length < 2) {
      alert("경로를 최적화하려면 2개 이상의 매물을 목록에 추가해야 합니다.");
      return;
    }
    if (!window.kakao.maps.services || !window.kakao.maps.services.Directions) {
        console.error("❌ [진단] '경로 최적화' 버튼 클릭 시점: 'services.Directions' 객체가 없습니다!");
        alert("카카오맵 'services.Directions' 라이브러리 로딩에 실패했습니다.");
        return;
    }
    setLoading(true);
    try {
        const d = new window.kakao.maps.services.Directions();
        const origin = { x: tourPins[0].lng, y: tourPins[0].lat };
        const destination = { x: tourPins[tourPins.length - 1].lng, y: tourPins[tourPins.length - 1].lat };
        const waypoints = tourPins.slice(1, -1).map(p => ({ x: p.lng, y: p.lat }));
        const request = { origin, destination, waypoints, optimize: true };
        const result = await new Promise((resolve, reject) => {
            d.route(request, (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) resolve(result);
                else reject(new Error(`API 실패: ${status}`));
            });
        });
        const route = result.routes[0];
        if (route) {
            if (routeLine) { routeLine.setMap(null); }
            const linePath = route.polyline.getPath();
            const polyline = new window.kakao.maps.Polyline({
                path: linePath, strokeWeight: 6, strokeColor: '#FF0000', strokeOpacity: 0.8, strokeStyle: 'solid'
            });
            polyline.setMap(mapInstanceRef.current);
            setRouteLine(polyline); 
            const optimizedOrder = route.waypoint_order; 
            const originalWaypoints = tourPins.slice(1, -1); 
            const optimizedWaypoints = optimizedOrder.map(idx => originalWaypoints[idx]);
            setTourPins([ tourPins[0], ...optimizedWaypoints, tourPins[tourPins.length - 1] ]);
            alert(`총 거리: ${(route.summary.distance / 1000).toFixed(1)}km, 예상 시간: ${Math.round(route.summary.duration / 60)}분 (최적화 완료)`);
        }
    } catch (error) {
        console.error('임장 동선 최적화 오류:', error);
        alert(`경로 탐색 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleContextMenuAction = (action) => {
    if (!contextMenu.latLng) return;
    if (action === 'createPin') {
        const tempPinData = {
            id: null, 
            lat: contextMenu.latLng.getLat(),
            lng: contextMenu.latLng.getLng(),
            memo: '새 매물 (메모 입력)',
            price: 0
        };
        setSelectedPin(tempPinData);
        setEditMemo(tempPinData.memo);
        setEditPrice(tempPinData.price);
        setLinkedCustomers([]);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };
  
  const handleSidebarSave = async (event) => {
    event.preventDefault();
    if (!selectedPin) return;

    if (selectedPin.id === null) {
        const newPinData = {
            lat: selectedPin.lat,
            lng: selectedPin.lng,
            memo: editMemo,
            price: Number(editPrice),
            user_id: session.user.id
        };
        await handleCreatePin(newPinData); 
    } else {
        await handleUpdatePin(selectedPin.id); 
    }
  };
  
  // --- 모든 State와 함수를 '창구(value)'에 담아 하위 컴포넌트에 전달 ---
  const value = {
    // State
    pins, setPins,
    loading, setLoading,
    selectedPin, setSelectedPin,
    editMemo, setEditMemo,
    editPrice, setEditPrice,
    customers, setCustomers,
    linkedCustomers, setLinkedCustomers,
    imContent, setImContent,
    isGenerating, setIsGenerating,
    tourPins, setTourPins,
    routeLine, setRouteLine,
    contextMenu, setContextMenu,

    // Refs (값 자체를 전달)
    tempMarkerRef,
    mapInstanceRef,
    markersRef,
    contextMenuRef,
    mapRef, // ★ 21일차 (수정): mapRef도 하위로 전달

    // Handlers
    fetchPins,
    fetchCustomers,
    fetchLinkedCustomers,
    drawMarkers,
    clearTempMarkerAndMenu,
    handleCreatePin,
    handleDeletePin,
    handleUpdatePin,
    handleLinkCustomer,
    handleUnlinkCustomer,
    searchNearby,
    handleGenerateIm,
    handleAddToTour,
    handleRemoveFromTour,
    handleClearTour,
    handleOptimizeTour,
    handleContextMenuAction,
    handleSidebarSave,

    // Props
    session,
    mode
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}