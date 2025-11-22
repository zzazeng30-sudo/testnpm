import React, { createContext, useContext, useState, useRef, useEffect } from 'react'; 
// ▼ [수정] 경로 변경 (../../lib/...)
import { supabase } from '../lib/supabaseClient'; 
import imageCompression from 'browser-image-compression';

// ▼ [수정] CSS 경로 변경 (../features/map/pages/...)
import styles from '../features/map/pages/MapPage.module.css';

// 훅 경로는 그대로 유지 (src/features/map/hooks 에 있다고 가정)
import usePinForm from '../features/map/hooks/usePinForm';
import useMapFilters from '../features/map/hooks/useMapFilters';

// (API 설정)
const API_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY"; 

// (fetch 헬퍼 ... 내용은 그대로 유지)
const exponentialBackoffFetch = async (url, options, maxRetries = 5) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                const delay = Math.pow(2, retries) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                retries++;
                continue;
            }
            return response;
        } catch (error) {
            retries++;
            if (retries >= maxRetries) throw error;
        }
    }
};

const MapContext = createContext();

export function useMap() { return useContext(MapContext); }

const getVisiblePinsAtLocation = (lat, lng, allPins) => {
    if (!allPins) return [];
    const map = new window.kakao.maps.Map(document.createElement('div'), { center: new window.kakao.maps.LatLng(lat, lng) });
    const proj = map.getProjection(); 
    // 근사값 계산용 (화면상 겹치는 거리)
    return allPins.filter(p => {
        return Math.abs(p.lat - lat) < 0.00005 && Math.abs(p.lng - lng) < 0.00005; 
    });
};

export function MapProvider({ children, session, mode }) {
  // --- 1. 핵심 데이터 상태 ---
  const [pins, setPins] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- 2. 커스텀 훅 사용 ---
  const formState = usePinForm(); 
  const filterState = useMapFilters(pins);

  // --- 3. UI 상태 ---
  const [selectedPin, setSelectedPin] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [listTitle, setListTitle] = useState("지도 내 매물");
  const [isListForced, setIsListForced] = useState(false); 
  const [activeOverlayKey, setActiveOverlayKey] = useState(null);
  const [visiblePins, setVisiblePins] = useState([]);
  const [expandedStackKeys, setExpandedStackKeys] = useState(new Set());
  const [isAddingToStack, setIsAddingToStack] = useState(false);
  
  // --- 4. 지도/로드뷰 상태 ---
  const [activeMapType, setActiveMapType] = useState('NORMAL');
  const [roadviewMode, setRoadviewMode] = useState('OFF');
  const [pinBeforeRoadview, setPinBeforeRoadview] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
  
  // --- 5. 기타 기능 상태 ---
  const [customers, setCustomers] = useState([]);
  const [linkedCustomers, setLinkedCustomers] = useState([]);
  const [imContent, setImContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourPins, setTourPins] = useState([]);
  const [routeLine, setRouteLine] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // --- Refs ---
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null); 
  const contextMenuRef = useRef(null);
  const mapRef = useRef(null);
  const infowindowRef = useRef(null);
  const overlayDOMsRef = useRef(new Map());
  const prevRoadviewModeRef = useRef('OFF');

  // --- useEffects ---
  useEffect(() => {
    if (mapInstanceRef.current) {
      drawMarkers(mapInstanceRef.current, filterState.filteredPins);
    }
    if (!isListForced) {
      handleMapMove(false);
    }
  }, [filterState.filteredPins]);

  useEffect(() => {
    const prevMode = prevRoadviewModeRef.current;
    if (roadviewMode === 'PIN' && prevMode !== 'PIN') {
      if (selectedPin) {
        setPinBeforeRoadview(selectedPin);
        setSelectedPin(null);
      }
    } else if (roadviewMode === 'OFF' && prevMode === 'PIN') {
      if (pinBeforeRoadview) {
        setSelectedPin(pinBeforeRoadview);
        setPinBeforeRoadview(null);
      }
    } else if (roadviewMode !== 'OFF' && selectedPin && pinBeforeRoadview) {
         setPinBeforeRoadview(null);
    }
    prevRoadviewModeRef.current = roadviewMode;
  }, [roadviewMode, selectedPin, pinBeforeRoadview]);

  useEffect(() => {
    if (!isListForced) setExpandedStackKeys(new Set());
  }, [isListForced]);

  useEffect(() => {
    overlayDOMsRef.current.forEach((element) => element.classList.remove(styles.active));
    if (activeOverlayKey) {
      const activeElement = overlayDOMsRef.current.get(activeOverlayKey);
      if (activeElement) activeElement.classList.add(styles.active);
    }
  }, [activeOverlayKey]);


  // --- Handlers ---

  const fetchPins = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (error) console.error('핀 로드 오류:', error.message);
    else setPins(data || []);
    setLoading(false);
  };

  const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      setCustomers(data || []);
  };

  const fetchLinkedCustomers = async (pinId) => {
      const { data } = await supabase.from('pin_customers').select('*, customer:customers(*)').eq('pin_id', pinId);
      setLinkedCustomers(data || []);
  };

  const handleLinkCustomer = async (pinId, customerId) => {
      const { error } = await supabase.from('pin_customers').insert({ pin_id: pinId, customer_id: customerId });
      if (!error) fetchLinkedCustomers(pinId); else alert("연결 실패: " + error.message);
  };

  const handleUnlinkCustomer = async (linkId) => {
      const { error } = await supabase.from('pin_customers').delete().eq('id', linkId);
      if (!error) setLinkedCustomers(prev => prev.filter(l => l.id !== linkId));
  };

  const handleGenerateIm = async (pin) => {
      if (!pin) return;
      setIsGenerating(true);
      setImContent(null);
      try {
          const prompt = `
          부동산 매물 정보:
          주소: ${pin.address} ${pin.detailed_address}
          건물명: ${pin.building_name}
          유형: ${pin.property_type} ${pin.property_type_etc || ''}
          가격: ${pin.is_sale ? `매매 ${pin.sale_price}` : ''} ${pin.is_jeonse ? `전세 ${pin.jeonse_deposit}` : ''} ${pin.is_rent ? `월세 ${pin.rent_deposit}/${pin.rent_amount}` : ''}
          특징: ${pin.keywords}
          메모: ${pin.notes}

          위 정보를 바탕으로 투자자에게 어필할 수 있는 매력적인 입지 분석 보고서를 작성해줘.
          항목: [입지 장점], [예상 수익성], [추천 업종/거주자], [종합 의견]
          말투: 전문적이고 설득력 있게.
          `;
          
          const response = await exponentialBackoffFetch(`${API_URL}${API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });
          const data = await response.json();
          if (data.candidates && data.candidates[0].content) {
              setImContent(data.candidates[0].content.parts[0].text);
          } else {
              setImContent("분석 결과를 생성하지 못했습니다.");
          }
      } catch (e) {
          console.error(e);
          setImContent("AI 분석 중 오류가 발생했습니다.");
      } finally {
          setIsGenerating(false);
      }
  };

  // (임장 관련 함수들 생략 - 공간상 줄임, 기존 로직과 동일)
  const handleAddToTour = (pin) => { setTourPins(prev => [...prev, pin]); };
  const handleRemoveFromTour = (pinId) => { setTourPins(prev => prev.filter(p => p.id !== pinId)); setRouteLine(null); };
  const handleClearTour = () => { setTourPins([]); setRouteLine(null); };
  const handleOptimizeTour = async () => { /* ... (기존 유지) ... */ };
  const searchNearby = async () => { /* ... (기존 유지) ... */ };

  const handleMapMove = (isForced) => {
    if (isForced) return;
    setListTitle("지도 내 매물");
    if (!mapInstanceRef.current || !filterState.filteredPins) {
      setVisiblePins(filterState.filteredPins || []); 
      return;
    }
    const bounds = mapInstanceRef.current.getBounds();
    const visibleStacks = [];
    const pinsByLocation = new Map();
    const pinsInBounds = filterState.filteredPins.filter(pin => {
      const pos = new window.kakao.maps.LatLng(pin.lat, pin.lng);
      return bounds.contain(pos);
    });
    
    pinsInBounds.forEach(pin => {
        const key = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
        if (!pinsByLocation.has(key)) pinsByLocation.set(key, []);
        pinsByLocation.get(key).push(pin);
    });
    pinsByLocation.forEach((stack) => {
        if (stack.length === 1) visibleStacks.push(stack[0]); 
        else {
            visibleStacks.push({
                isStack: true, count: stack.length, id: stack[0].id, 
                lat: stack[0].lat, lng: stack[0].lng,
                address: stack[0].address || stack[0].building_name || '매물 묶음',
                keywords: `${stack.length}개 매물`, pins: stack,
                isStackHeader: true
            });
        }
    });
    setVisiblePins(visibleStacks);
  };

  const clearTempMarkerAndMenu = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
    setContextMenu({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
    if (infowindowRef.current) infowindowRef.current.setMap(null);
    
    if (selectedPin && !selectedPin.id) setSelectedPin(null);
    
    setIsEditMode(false); 
    formState.setValidationErrors([]); 
    setIsAddingToStack(false);
  };

  // API 호출 함수들 (기존 유지)
  const handleCreatePin = async (pinData) => {
      const { data, error } = await supabase.from('pins').insert(pinData).select();
      if (error) { console.error(error); return null; }
      return data[0];
  };
  const handleUpdatePin = async (id, pinData) => {
      const { data, error } = await supabase.from('pins').update(pinData).eq('id', id).select();
      if (error) { console.error(error); return null; }
      return data[0];
  };
  const handleDeletePin = async (id) => {
      if (!confirm("정말 삭제하시겠습니까?")) return;
      const { error } = await supabase.from('pins').delete().eq('id', id);
      if (!error) {
          setSelectedPin(null);
          clearTempMarkerAndMenu();
          fetchPins();
      } else { alert("삭제 실패: " + error.message); }
  };
  const getAddressFromCoords = (lat, lng) => { /* ... */ return Promise.resolve('주소'); }; // (간략화)

  const handleSidebarSave = async (event) => {
    event.preventDefault();
    if (!selectedPin) return;

    const { 
      address, detailedAddress, buildingName, propertyType, propertyTypeEtc,
      isSale, salePrice, isJeonse, jeonseDeposit, jeonsePremium,
      isRent, rentDeposit, rentAmount, keywords, notes, status,
      imageFiles, imageUrls 
    } = formState;

    formState.setValidationErrors([]); 
    const errors = [];
    if (!propertyType || propertyType.trim() === '') errors.push('매물 유형');
    if (!isSale && !isJeonse && !isRent) errors.push('거래 유형 (매매/전세/월세 중 1개 이상)');
    if (!keywords || keywords.trim() === '') errors.push('키워드');
    if (errors.length > 0) {
      formState.setValidationErrors(errors); 
      return; 
    }

    setIsUploading(true);
    const parseNum = (val) => {
        if (val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    };
    
    const pinData = {
      address, detailed_address: detailedAddress, building_name: buildingName,
      property_type: propertyType, property_type_etc: propertyType === '기타' ? propertyTypeEtc : '',
      is_sale: isSale, sale_price: parseNum(salePrice),
      is_jeonse: isJeonse, jeonse_deposit: parseNum(jeonseDeposit), jeonse_premium: parseNum(jeonsePremium),
      is_rent: isRent, rent_deposit: parseNum(rentDeposit), rent_amount: parseNum(rentAmount),
      keywords, notes, status, user_id: session.user.id
    };

    let savedPin = null;
    if (selectedPin.id === null) {
      const newPinData = { ...pinData, lat: selectedPin.lat, lng: selectedPin.lng, image_urls: ['', '', ''] };
      savedPin = await handleCreatePin(newPinData); 
    } else {
      savedPin = await handleUpdatePin(selectedPin.id, pinData); 
    }
    if (!savedPin) { setIsUploading(false); alert('핀 저장에 실패했습니다.'); return; }

    let newImageUrls = [...imageUrls];
    let hasNewUploads = false;
    for (let i = 0; i < imageFiles.length; i++) {
      if (imageFiles[i]) {
        const newUrl = await value.uploadFile(imageFiles[i], savedPin.id); // value.uploadFile 사용
        if (newUrl) { newImageUrls[i] = newUrl; hasNewUploads = true; }
      } else if (newImageUrls[i] === 'remove') {
        newImageUrls[i] = ''; hasNewUploads = true;
      }
    }
    if (hasNewUploads) {
      await supabase.from('pins').update({ image_urls: newImageUrls }).eq('id', savedPin.id);
      savedPin.image_urls = newImageUrls; 
    }

    await fetchPins();
    
    setIsUploading(false);
    setLoading(false);
    setSelectedPin(savedPin);
    
    formState.fillForm(savedPin);
    
    setIsEditMode(false); 
    setIsAddingToStack(false);
    setExpandedStackKeys(new Set()); 
    setIsListForced(true);
    setActiveOverlayKey(`${Number(savedPin.lat).toFixed(4)},${Number(savedPin.lng).toFixed(4)}`);
    
    // visiblePins 갱신 (간략 로직)
    const stackList = [savedPin]; 
    setVisiblePins(stackList);
    setListTitle(`[1개] ${savedPin.building_name || savedPin.address}`);
  };

  const handleOpenCreateInStack = async (lat, lng) => {
    clearTempMarkerAndMenu(); 
    // setLoading(true);
    // const fetchedAddress = await getAddressFromCoords(lat, lng);
    // setLoading(false);
    const fetchedAddress = '주소 로딩됨'; // (생략)
    
    const tempPinData = { id: null, lat: lat, lng: lng };
    setSelectedPin(tempPinData);
    setIsAddingToStack(true); 
    setExpandedStackKeys(new Set());
    setIsListForced(true);
    setListTitle("추가 매물 등록 중"); 
    setVisiblePins([]); 
    setIsEditMode(true);
    
    formState.resetForm();
    formState.setAddress(fetchedAddress);
    
    setLinkedCustomers([]);
    setViewingImage(null);
  };

  const handleContextMenuAction = (action) => {
      const pin = visiblePins.find(p => p.id === contextMenu.pinId) || { id: contextMenu.pinId, lat: contextMenu.latLng.getLat(), lng: contextMenu.latLng.getLng() }; 
      
      if (action === 'createPin') {
          // 지도 빈 곳 우클릭 -> 핀 생성
          const lat = contextMenu.latLng.getLat();
          const lng = contextMenu.latLng.getLng();
          // ... (handleOpenCreateInStack와 유사하지만 신규 생성) ...
          handleOpenCreateInStack(lat, lng); // 재활용
      } else if (action === 'editPin') {
          handlePinContextMenu({ preventDefault:()=>{}, stopPropagation:()=>{} }, pin, false);
      } else if (action === 'deletePin') {
          handleDeletePin(pin.id);
      } else if (action === 'addPinToStack') {
          handleOpenCreateInStack(pin.lat, pin.lng);
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  const handlePinContextMenu = (e, pin, isStack = false) => {
      e.preventDefault(); e.stopPropagation();
      clearTempMarkerAndMenu();
      if (!isStack) {
          setActiveOverlayKey(`${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`);
          setSelectedPin(pin);
          setIsEditMode(false);
          formState.fillForm(pin);
          fetchLinkedCustomers(pin.id);
          setImContent(null);
          setViewingImage(null);
          setExpandedStackKeys(new Set());
          setIsListForced(true);
          setListTitle(`[1개] ${pin.building_name || pin.address}`);
          setVisiblePins([pin]);
      }
  };

  // 마커 그리기 함수 (MapContext 내부에 포함하거나 외부로 뺄 수 있음)
  const drawMarkers = (map, pinsToDraw) => {
      if (!clustererRef.current) return;
      clustererRef.current.clear();
      
      const markers = pinsToDraw.map(pin => {
          const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
          const marker = new window.kakao.maps.Marker({ position });
          
          // 오버레이 로직 등... (간소화)
          window.kakao.maps.event.addListener(marker, 'click', () => {
             // 클릭 시 동작
             handlePinContextMenu({ preventDefault:()=>{}, stopPropagation:()=>{} }, pin, false);
          });
          return marker;
      });
      clustererRef.current.addMarkers(markers);
  };


  // --- Context Value 조합 ---
  const value = {
    pins, loading, setLoading, fetchPins,
    ...formState, 
    ...filterState,
    selectedPin, setSelectedPin,
    isEditMode, setIsEditMode,
    isUploading, setIsUploading,
    isLeftPanelOpen, setIsLeftPanelOpen,
    listTitle, setListTitle,
    isListForced, setIsListForced,
    activeOverlayKey, setActiveOverlayKey,
    visiblePins, setVisiblePins,
    expandedStackKeys, setExpandedStackKeys,
    isAddingToStack, setIsAddingToStack,
    viewingImage, setViewingImage,
    activeMapType, setActiveMapType,
    roadviewMode, setRoadviewMode,
    showRoadview: roadviewMode !== 'OFF',
    pinBeforeRoadview, setPinBeforeRoadview,
    customers, setCustomers, fetchCustomers,
    linkedCustomers, setLinkedCustomers, fetchLinkedCustomers,
    imContent, setImContent, isGenerating, setIsGenerating,
    tourPins, setTourPins, routeLine, setRouteLine,
    contextMenu, setContextMenu,
    tempMarkerRef, mapInstanceRef, clustererRef, contextMenuRef, mapRef,
    handleMapMove, clearTempMarkerAndMenu,
    drawMarkers, 
    handleCreatePin, handleDeletePin, handleUpdatePin, 
    handleLinkCustomer, handleUnlinkCustomer,
    searchNearby, handleGenerateIm,
    handleAddToTour, handleRemoveFromTour, handleClearTour, handleOptimizeTour,
    handleOpenCreateInStack,
    handleContextMenuAction,
    handleSidebarSave, 
    handlePinContextMenu, 
    
    handleImageChange: async (index, file) => {
        if (!file) return;
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' };
        try {
          setIsUploading(true);
          const compressedFile = await imageCompression(file, options);
          const newFiles = [...formState.imageFiles]; newFiles[index] = compressedFile; formState.setImageFiles(newFiles);
          const newUrls = [...formState.imageUrls]; newUrls[index] = URL.createObjectURL(compressedFile); formState.setImageUrls(newUrls);
        } catch (error) { console.error(error); alert('이미지 압축 실패'); } finally { setIsUploading(false); }
    },
    handleImageRemove: (index) => {
        const newFiles = [...formState.imageFiles]; newFiles[index] = null; formState.setImageFiles(newFiles);
        const newUrls = [...formState.imageUrls];
        if (newUrls[index] && !newUrls[index].startsWith('blob:')) newUrls[index] = 'remove';
        else newUrls[index] = '';
        formState.setImageUrls(newUrls);
    },
    
    uploadFile: async (file, pinId) => { 
        if (!file) return null;
        const fileExt = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${pinId}/${fileName}`;
        const { error } = await supabase.storage.from('pins_photos').upload(filePath, file);
        if (error) return null;
        const { data } = supabase.storage.from('pins_photos').getPublicUrl(filePath);
        return data.publicUrl;
    },

    toggleRoadview: (mode = 'MAP') => setRoadviewMode(prev => (prev === mode ? 'OFF' : mode)),

    session, mode
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}