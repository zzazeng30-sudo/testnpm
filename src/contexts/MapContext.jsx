// src/contexts/MapContext.jsx (수정)
import React, { createContext, useContext, useState, useRef } from 'react';
import { supabase } from '../supabaseClient.js';
import imageCompression from 'browser-image-compression'; // ★ 압축 라이브러리

// (API 설정, 헬퍼 함수 등은 100% 동일)
const API_MODEL = 'gemini-2.5-flash'; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY"; 

// ★ (수정) 핀 URL을 상태별로 3가지 정의
const PIN_STATUS_BEFORE = 'https://placehold.co/36x36/ffab73/000000?text=P'; // 거래전 (연주황)
const PIN_STATUS_IN_PROGRESS = 'https://placehold.co/36x36/dc2626/ffffff?text=P'; // 거래중 (빨강)
const PIN_STATUS_COMPLETE = 'https://placehold.co/36x36/7dd3fc/000000?text=P'; // 거래완료 (하늘)

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
  
  // ★ (수정) 폼 상태
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState(''); 
  const [buildingName, setBuildingName] = useState('');
  const [isSale, setIsSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [isJeonse, setIsJeonse] = useState(false);
  const [jeonseDeposit, setJeonseDeposit] = useState('');
  const [jeonsePremium, setJeonsePremium] = useState('');
  const [isRent, setIsRent] = useState(false);
  const [rentDeposit, setRentDeposit] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState(''); 
  const [status, setStatus] = useState('거래전'); 

  // ★ (추가) 사진 업로드용 state
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [imageUrls, setImageUrls] = useState(['', '', '']);
  const [isUploading, setIsUploading] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [linkedCustomers, setLinkedCustomers] = useState([]);
  const [imContent, setImContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourPins, setTourPins] = useState([]);
  const [routeLine, setRouteLine] = useState(null);
  const [contextMenu, setContextMenu] = useState({ 
    visible: false, latLng: null, x: 0, y: 0
  });

  const [viewingImage, setViewingImage] = useState(null);
  
  // ★ (수정) 지도 컨트롤 state
  const [showCadastral, setShowCadastral] = useState(false);
  const [mapType, setMapType] = useState('NORMAL'); // 'NORMAL' or 'SKYVIEW'
  const [showRoadview, setShowRoadview] = useState(false); // 로드뷰 컨트롤 표시 여부

  // --- Refs ---
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const contextMenuRef = useRef(null);
  const mapRef = useRef(null); 

  // --- Handlers (MapPage.jsx에서 그대로 복사) ---
  
  // ★ (추가) 역 지오코딩 헬퍼 함수
  const getAddressFromCoords = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        resolve('Geocoder 로드 실패'); return;
      }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const road = result[0].road_address ? result[0].road_address.address_name : null;
          const jibun = result[0].address ? result[0].address.address_name : null;
          resolve(road || jibun || '주소 정보 없음');
        } else {
          resolve('주소 변환 실패');
        }
      });
    });
  };

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
  
  // ★ (수정) drawMarkers 함수 수정
  const drawMarkers = (map, pinData) => {
    if (!window.kakao || !map) return;
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};
    const imageSize = new window.kakao.maps.Size(36, 36);
    
    // ★ 3가지 상태의 마커 이미지를 미리 생성
    const markerImageBefore = new window.kakao.maps.MarkerImage(PIN_STATUS_BEFORE, imageSize);
    const markerImageInProgress = new window.kakao.maps.MarkerImage(PIN_STATUS_IN_PROGRESS, imageSize);
    const markerImageComplete = new window.kakao.maps.MarkerImage(PIN_STATUS_COMPLETE, imageSize);

    pinData.forEach(pin => {
        // ★ pin.status에 따라 사용할 마커 이미지를 선택
        let markerImage;
        if (pin.status === '거래중') {
            markerImage = markerImageInProgress;
        } else if (pin.status === '거래완료') {
            markerImage = markerImageComplete;
        } else {
            // '거래전'이거나 status가 null(기본값)인 경우
            markerImage = markerImageBefore;
        }
        
        const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
        const marker = new window.kakao.maps.Marker({ 
            map, 
            position, 
            image: markerImage // ★ 선택된 마커 이미지 적용
        });
        
        window.kakao.maps.event.addListener(marker, 'click', () => { 
            clearTempMarkerAndMenu(); 
            setSelectedPin(pin);
            
            // ★ 핀 데이터를 새 폼 state에 채워넣기
            setAddress(pin.address || '');
            setDetailedAddress(pin.detailed_address || ''); 
            setBuildingName(pin.building_name || '');
            setIsSale(pin.is_sale || false);
            setSalePrice(pin.sale_price || '');
            setIsJeonse(pin.is_jeonse || false);
            setJeonseDeposit(pin.jeonse_deposit || '');
            setJeonsePremium(pin.jeonse_premium || '');
            setIsRent(pin.is_rent || false);
            setRentDeposit(pin.rent_deposit || '');
            setRentAmount(pin.rent_amount || '');
            setKeywords(pin.keywords || '');
            setNotes(pin.notes || '');
            setStatus(pin.status || '거래전'); 
            setImageUrls(pin.image_urls || ['', '', '']); 
            setImageFiles([null, null, null]); 

            fetchLinkedCustomers(pin.id);
            setImContent(null); 
            setViewingImage(null); 
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
    const { data, error } = await supabase.from('pins').insert(newPinData).select().single(); 
    if (error) {
        console.error('핀 생성 오류:', error.message);
        setLoading(false);
        return null;
    } else {
      const createdPin = data;
      clearTempMarkerAndMenu(); 
      await fetchPins(); 
      setSelectedPin(createdPin);
      return createdPin; 
    }
  };

  const handleDeletePin = async (pinId) => {
    setLoading(true);
    // (미래) TODO: 핀 삭제 시 스토리지에 업로드된 사진도 함께 삭제
    const { error } = await supabase.from('pins').delete().eq('id', pinId); 
    if (error) console.error('핀 삭제 오류:', error.message);
    else {
      setPins(currentPins => currentPins.filter(p => p.id !== pinId));
      setSelectedPin(null);
      handleRemoveFromTour(pinId); 
    }
    setLoading(false);
  };

  const handleUpdatePin = async (pinId, updatedData) => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').update(updatedData).eq('id', pinId).select().single(); 
    if (error) {
      console.error('핀 수정 오류:', error.message);
      setLoading(false);
      return null;
    } else {
      const updatedPin = data;
      setPins(currentPins => currentPins.map(p => (p.id === pinId ? updatedPin : p)));
      setSelectedPin(updatedPin);
      setTourPins(currentTourPins => 
        currentTourPins.map(p => (p.id === pinId ? updatedPin : p))
      );
      // ★ 핀 목록을 다시 그려서 색상 즉시 업데이트
      if (mapInstanceRef.current) {
        drawMarkers(mapInstanceRef.current, pins.map(p => (p.id === pinId ? updatedPin : p)));
      }
      return updatedPin; 
    }
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
    
    const systemPrompt = `당신은 숙련된 부동산 입지 분석가입니다. 제공된 실제 주변 시설 데이터를 바탕으로 전문적이고 신뢰감 있는 브리핑 리포트를 작성합니다.`;
    const userQuery = `다음은 매물(좌표: ${pin.lat}, ${pin.lng}) 3km 이내 '실제 시설 목록'입니다. 이 데이터를 바탕으로 브리핑 리포트를 작성해 주세요. \n--- \n[실제 시설 목록]\n ${realData} \n--- \n[추가 참고 사항]\n키워드: ${pin.keywords || '없음'}\n상세메모: ${pin.notes || '없음'}\n--- \n리포트:`;
    
    const payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] }, 
      contents: [{ role: 'user', parts: [{ text: userQuery }] }],
    };
    if (!API_KEY) { 
      setImContent("API 키가 없습니다.");
      setIsGenerating(false); setLoading(false); return;
    }
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

  // ★ (수정) handleContextMenuAction: 주소 자동 등록 기능 추가
  const handleContextMenuAction = async (action) => { // async 추가
    if (!contextMenu.latLng) return;
    if (action === 'createPin') {
        const lat = contextMenu.latLng.getLat();
        const lng = contextMenu.latLng.getLng();
        
        // ★ (핵심) 주소 자동 등록
        setLoading(true);
        const fetchedAddress = await getAddressFromCoords(lat, lng);
        setLoading(false);

        const tempPinData = {
            id: null, 
            lat: lat,
            lng: lng,
        };
        setSelectedPin(tempPinData);

        // ★ (수정) 새 핀 클릭 시, 폼 상태 초기화
        setAddress(fetchedAddress); // ★ 자동 등록된 주소 설정
        setDetailedAddress('');     
        setBuildingName('');
        setIsSale(false);
        setSalePrice('');
        setIsJeonse(false);
        setJeonseDeposit('');
        setJeonsePremium('');
        setIsRent(false);
        setRentDeposit('');
        setRentAmount('');
        setKeywords('');
        setNotes('');
        setStatus('거래전'); 
        setImageUrls(['', '', '']); 
        setImageFiles([null, null, null]); 
        setLinkedCustomers([]);
        setViewingImage(null); 
    }
    setContextMenu({ ...contextMenu, visible: false });
  };
  
  // ★ (추가) 사진 업로드 로직
  const uploadFile = async (file, pinId) => {
    if (!file) return null;
    
    // 파일 이름 고유하게 만들기
    // ★ (수정) WebP 사용 시 파일 확장자를 '.webp'로 고정
    const fileExt = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${pinId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('pins_photos') // ★ Supabase 스토리지 버킷 이름
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return null;
    }

    const { data } = supabase.storage
      .from('pins_photos')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  // ★ (수정) handleSidebarSave: 사진 업로드 로직 포함
  const handleSidebarSave = async (event) => {
    event.preventDefault();
    if (!selectedPin) return;

    setIsUploading(true); // ★ 업로드 시작

    const pinData = {
        address: address,
        detailed_address: detailedAddress, 
        building_name: buildingName,
        is_sale: isSale,
        sale_price: Number(salePrice) || null,
        is_jeonse: isJeonse,
        jeonse_deposit: Number(jeonseDeposit) || null,
        jeonse_premium: Number(jeonsePremium) || null,
        is_rent: isRent,
        rent_deposit: Number(rentDeposit) || null,
        rent_amount: Number(rentAmount) || null,
        keywords: keywords,
        notes: notes,
        status: status, // ★ (추가) 상태 저장
        user_id: session.user.id
        // image_urls는 아래에서 처리
    };

    let savedPin = null;

    if (selectedPin.id === null) {
        // 1. 새 핀 생성 (이미지 URL 없이)
        const newPinData = {
            ...pinData,
            lat: selectedPin.lat,
            lng: selectedPin.lng,
            image_urls: ['', '', ''], // 빈 배열로 초기화
        };
        savedPin = await handleCreatePin(newPinData);
    } else {
        // 1. 기존 핀 수정 (이미지 URL 없이)
        savedPin = await handleUpdatePin(selectedPin.id, pinData);
    }

    if (!savedPin) {
      setIsUploading(false);
      alert('핀 저장에 실패했습니다.');
      return;
    }

    // 2. 사진 업로드 처리
    let newImageUrls = [...imageUrls]; // 기존 URL 배열
    let hasNewUploads = false;

    // imageFiles 배열을 순회하며 새 파일 업로드
    for (let i = 0; i < imageFiles.length; i++) {
        if (imageFiles[i]) { // 새 파일이 선택된 슬롯
            const newUrl = await uploadFile(imageFiles[i], savedPin.id);
            if (newUrl) {
                newImageUrls[i] = newUrl;
                hasNewUploads = true;
            }
        } else if (newImageUrls[i] === 'remove') { // 'remove' 플래그가 있는 슬롯
            newImageUrls[i] = ''; // URL을 비움
            hasNewUploads = true;
        }
    }

    // 3. (필요시) 이미지 URL로 핀 정보 다시 업데이트
    if (hasNewUploads) {
        const { data: updatedPin, error: updateImageError } = await supabase
            .from('pins')
            .update({ image_urls: newImageUrls })
            .eq('id', savedPin.id)
            .select()
            .single();
        
        if (updateImageError) {
            console.error('이미지 URL 업데이트 오류:', updateImageError.message);
        } else {
            savedPin = updatedPin;
        }
    }

    // 4. 상태 완료 및 정리
    setIsUploading(false);
    setLoading(false);
    // (수정) clearTempMarkerAndMenu() 제거 -> 저장 후에도 폼 유지
    await fetchPins(); // 맵 마커 새로고침 (색상 변경)
    setSelectedPin(savedPin); // selectedPin을 최신 정보로 업데이트
    
    // 로컬 폼 상태를 최종 저장된 핀 정보로 업데이트
    setAddress(savedPin.address || '');
    setDetailedAddress(savedPin.detailed_address || '');
    setBuildingName(savedPin.building_name || '');
    setStatus(savedPin.status || '거래전'); 
    setImageUrls(savedPin.image_urls || ['', '', '']);
    setImageFiles([null, null, null]);
  };
  
  // ★ (수정) 사진 변경 시, WebP 압축 로직 추가
  const handleImageChange = async (index, file) => {
    if (!file) return;

    // ★ (수정) 0.5MB (500KB) + 1280px 옵션
    const options = {
      maxSizeMB: 0.5,           // ★ 목표: 0.5MB (500KB)
      maxWidthOrHeight: 1280,   // ★ 최대 1280px
      useWebWorker: true,
      fileType: 'image/webp', // ★ (핵심) WebP 포맷으로 압축
    };

    try {
      setIsUploading(true); // '압축 중...'으로 상태 변경
      
      console.log(`원본 사진 크기: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 이미지 압축
      const compressedFile = await imageCompression(file, options);
      
      console.log(`압축된 사진(WebP) 크기: ${(compressedFile.size / 1024).toFixed(2)} KB`);

      // 압축된 파일을 state에 저장
      const newFiles = [...imageFiles];
      newFiles[index] = compressedFile;
      setImageFiles(newFiles);

      // 로컬 미리보기를 위해 임시 URL 생성
      const newUrls = [...imageUrls];
      newUrls[index] = URL.createObjectURL(compressedFile); // 로컬 blob URL
      setImageUrls(newUrls);

    } catch (error) {
      console.error('이미지 압축 실패:', error);
      alert('이미지 압축에 실패했습니다. 다른 파일을 시도해 주세요.');
    } finally {
      setIsUploading(false); // 압축 완료
    }
  };

  const handleImageRemove = (index) => {
    const newFiles = [...imageFiles];
    newFiles[index] = null;
    setImageFiles(newFiles);

    const newUrls = [...imageUrls];
    // 만약 기존에 저장된 URL(http...)이면, 'remove'로 표시하여 저장 시 삭제
    if (imageUrls[index] && !imageUrls[index].startsWith('blob:')) {
        newUrls[index] = 'remove'; 
    } else {
    // 새로 추가한 파일(blob:...)의 미리보기였으면, 그냥 비움
        newUrls[index] = '';
    }
    setImageUrls(newUrls);
  };
  
  // ★ (추가) 지도 컨트롤 핸들러
  const toggleCadastral = () => setShowCadastral(prev => !prev);
  const toggleRoadview = () => setShowRoadview(prev => !prev);


  // --- 모든 State와 함수를 '창구(value)'에 담아 하위 컴포넌트에 전달 ---
  const value = {
    // State
    pins, setPins,
    loading, setLoading,
    selectedPin, setSelectedPin,
    
    address, setAddress,
    detailedAddress, setDetailedAddress, 
    buildingName, setBuildingName,
    isSale, setIsSale,
    salePrice, setSalePrice,
    isJeonse, setIsJeonse,
    jeonseDeposit, setJeonseDeposit,
    jeonsePremium, setJeonsePremium,
    isRent, setIsRent,
    rentDeposit, setRentDeposit,
    rentAmount, setRentAmount,
    keywords, setKeywords,
    notes, setNotes,
    status, setStatus, 

    imageFiles, setImageFiles,     
    imageUrls, setImageUrls,       
    isUploading, setIsUploading, 
    
    viewingImage, setViewingImage, 
    
    // ★ (수정) 지도 컨트롤 state
    showCadastral, setShowCadastral, 
    mapType, setMapType,
    showRoadview, setShowRoadview,

    customers, setCustomers,
    linkedCustomers, setLinkedCustomers,
    imContent, setImContent,
    isGenerating, setIsGenerating,
    tourPins, setTourPins,
    routeLine, setRouteLine,
    contextMenu, setContextMenu,

    // Refs
    tempMarkerRef,
    mapInstanceRef,
    markersRef,
    contextMenuRef,
    mapRef, 

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
    
    handleImageChange,  
    handleImageRemove,  

    // ★ (추가) 지도 컨트롤 핸들러
    toggleCadastral,
    toggleRoadview,

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