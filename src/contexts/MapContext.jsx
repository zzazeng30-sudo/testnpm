// src/contexts/MapContext.jsx (전체 덮어쓰기)
import React, { createContext, useContext, useState, useRef, useEffect } from 'react'; 
import { supabase } from '../supabaseClient.js'; // ★ [수정] ./ -> ../
import imageCompression from 'browser-image-compression';
import styles from '../MapPage.module.css';

// (API 설정 ... 변경 없음)
const API_MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${API_MODEL}:generateContent?key=`;
const API_KEY = "AIzaSyCGt5A6VU0Htm3c8AHOhhsGyqPlcwPYrDY";

// (fetch 헬퍼 ... 변경 없음)
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


// 1. Context 생성
const MapContext = createContext();

// 2. useMap 훅
export function useMap() {
  return useContext(MapContext);
}

// ★★★ (추가) 특정 좌표의 핀을 가져와 LeftPanel용 리스트로 포맷하는 헬퍼 함수 ★★★
const getVisiblePinsAtLocation = (lat, lng, allPins) => {
    const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
    
    // 1. Find all pins at the location
    const stack = allPins.filter(p => {
        const pinKey = `${Number(p.lat).toFixed(4)},${Number(p.lng).toFixed(4)}`;
        return pinKey === key;
    });

    if (stack.length === 0) return [];

    // 2. Format for visiblePins state
    if (stack.length === 1) {
        return [stack[0]];
    } else {
        // 스택 헤더 생성
        const stackHeader = {
            isStackHeader: true, 
            isStack: true,
            count: stack.length,
            // 스택 Key는 lat/lng을 기반으로 합니다.
            id: key, 
            lat: lat,
            lng: lng,
            address: stack[0].address || stack[0].building_name || '매물 묶음',
            keywords: `${stack.length}개 매물`,
            pins: stack,
        };
        return [stackHeader, ...stack];
    }
};
// ★★★ (추가 종료) ★★★


// 3. MapProvider (뇌)
export function MapProvider({ children, session, mode }) {
  // --- State ---
  const [pins, setPins] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [address, setAddress] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeEtc, setPropertyTypeEtc] = useState('');
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
    visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false
  });
  const [viewingImage, setViewingImage] = useState(null);
  const [activeMapType, setActiveMapType] = useState('NORMAL');
  const [roadviewMode, setRoadviewMode] = useState('OFF'); // 'OFF', 'PIN', 'MAP'
  
  // ★ [추가] 'PIN' 모드에서 로드뷰를 켜기 전 선택했던 핀을 임시 저장
  const [pinBeforeRoadview, setPinBeforeRoadview] = useState(null);

  const [filterPropertyType, setFilterPropertyType] = useState('ALL');
  const [filterTransactionType, setFilterTransactionType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filteredPins, setFilteredPins] = useState([]);
  const [visiblePins, setVisiblePins] = useState([]);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [validationErrors, setValidationErrors] = useState([]);
  const [listTitle, setListTitle] = useState("지도 내 매물");
  const [isListForced, setIsListForced] = useState(false); 
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeOverlayKey, setActiveOverlayKey] = useState(null);
  const [isAddingToStack, setIsAddingToStack] = useState(false);

  const [expandedStackKeys, setExpandedStackKeys] = useState(new Set());

  // --- Refs ---
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null); 
  const contextMenuRef = useRef(null);
  const mapRef = useRef(null);
  const infowindowRef = useRef(null);
  const overlayDOMsRef = useRef(new Map());
  
  // ★ [추가] 이전 로드뷰 모드를 기억하기 위한 Ref
  const prevRoadviewModeRef = useRef('OFF');

  // --- (useEffects ... 변경 없음) ---
  useEffect(() => {
    if (!isListForced) {
      setExpandedStackKeys(new Set());
    }
  }, [isListForced]);

  // ★ [추가] 로드뷰 모드 변경 시 사이드바(selectedPin) 상태를 제어하는 useEffect
  useEffect(() => {
    const prevMode = prevRoadviewModeRef.current;

    // Case 1: 'PIN' 모드 진입 시 (예: 'OFF' -> 'PIN')
    if (roadviewMode === 'PIN' && prevMode !== 'PIN') {
      if (selectedPin) {
        setPinBeforeRoadview(selectedPin); // 현재 핀 저장
        setSelectedPin(null); // 사이드바 닫기
      }
    } 
    // Case 2: 'PIN' 모드 종료 시 (예: 'PIN' -> 'OFF')
    else if (roadviewMode === 'OFF' && prevMode === 'PIN') {
      if (pinBeforeRoadview) {
        setSelectedPin(pinBeforeRoadview); // 저장했던 핀 복원
        setPinBeforeRoadview(null); // 임시 핀 비우기
      }
    }
    // Case 3: 로드뷰가 켜진 상태(PIN 또는 MAP)에서 사용자가 지도에서 *다른* 핀을 클릭한 경우
    // (이 경우, '복원' 동작을 취소해야 함)
    else if (roadviewMode !== 'OFF' && selectedPin && pinBeforeRoadview) {
         setPinBeforeRoadview(null); // 임시 핀 비우기
    }

    // 현재 모드를 Ref에 저장하여 다음 렌더링 시 'prevMode'로 사용
    prevRoadviewModeRef.current = roadviewMode;
    
  }, [roadviewMode, selectedPin, pinBeforeRoadview]); // ★ pinBeforeRoadview 의존성 추가


  const handleMapMove = (isForced) => {
    // ... (변경 없음) ...
    if (isForced) return;
    setListTitle("지도 내 매물");
    if (!mapInstanceRef.current || !filteredPins) {
      setVisiblePins(filteredPins || []); 
      return;
    }
    const bounds = mapInstanceRef.current.getBounds();
    const visibleStacks = [];
    const pinsByLocation = new Map();
    const pinsInBounds = filteredPins.filter(pin => {
      const pos = new window.kakao.maps.LatLng(pin.lat, pin.lng);
      return bounds.contain(pos);
    });
    pinsInBounds.forEach(pin => {
        const key = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
        if (!pinsByLocation.has(key)) {
            pinsByLocation.set(key, []);
        }
        pinsByLocation.get(key).push(pin);
    });
    pinsByLocation.forEach((stack) => {
        if (stack.length === 1) {
            visibleStacks.push(stack[0]); 
        } else {
            visibleStacks.push({
                isStack: true,
                count: stack.length,
                id: stack[0].id, 
                lat: stack[0].lat,
                lng: stack[0].lng,
                address: stack[0].address || stack[0].building_name || '매물 묶음',
                keywords: `${stack.length}개 매물`,
                pins: stack,
            });
        }
    });
    setVisiblePins(visibleStacks);
  };

  useEffect(() => {
    // ... (변경 없음) ...
    let newFilteredPins = [...pins];
    if (filterPropertyType !== 'ALL') {
      newFilteredPins = newFilteredPins.filter(p => p.property_type === filterPropertyType);
    }
    if (filterTransactionType !== 'ALL') {
      if (filterTransactionType === '매매') newFilteredPins = newFilteredPins.filter(p => p.is_sale);
      else if (filterTransactionType === '전세') newFilteredPins = newFilteredPins.filter(p => p.is_jeonse);
      else if (filterTransactionType === '월세') newFilteredPins = newFilteredPins.filter(p => p.is_rent);
    }
    if (filterStatus !== 'ALL') {
      newFilteredPins = newFilteredPins.filter(p => p.status === filterStatus);
    }
    setFilteredPins(newFilteredPins);
  }, [pins, filterPropertyType, filterTransactionType, filterStatus]);
  
  useEffect(() => {
    // ... (변경 없음) ...
    if (mapInstanceRef.current) {
      drawMarkers(mapInstanceRef.current, filteredPins);
    }
    if (!isListForced) {
      handleMapMove(false);
    }
  }, [filteredPins]);
  
  useEffect(() => {
    // ... (변경 없음) ...
    overlayDOMsRef.current.forEach((element) => {
      element.classList.remove(styles.active);
    });
    if (activeOverlayKey) {
      const activeElement = overlayDOMsRef.current.get(activeOverlayKey);
      if (activeElement) {
        activeElement.classList.add(styles.active);
      }
    }
  }, [activeOverlayKey]);


  // --- Handlers ---
  // (formatPriceForInfowindow ... 변경 없음)
  const formatPriceForInfowindow = (pin) => {
    // ... (변경 없음) ...
    const prices = [];
    const hasSalePrice = (pin.sale_price !== null && pin.sale_price !== undefined);
    const hasJeonseDeposit = (pin.jeonse_deposit !== null && pin.jeonse_deposit !== undefined);
    const hasJeonsePremium = (pin.jeonse_premium !== null && pin.jeonse_premium !== undefined);
    const hasRentDeposit = (pin.rent_deposit !== null && pin.rent_deposit !== undefined);
    const hasRentAmount = (pin.rent_amount !== null && pin.rent_amount !== undefined);

    if (pin.is_sale && hasSalePrice) {
      prices.push(`매매: ${Number(pin.sale_price).toLocaleString()} 만원`);
    }
    if (pin.is_jeonse && (hasJeonseDeposit || hasJeonsePremium)) {
      if (hasJeonseDeposit && hasJeonsePremium) {
        prices.push(`전세: ${Number(pin.jeonse_deposit).toLocaleString()} 만원 (권리금: ${Number(pin.jeonse_premium).toLocaleString()} 만원)`);
      } else if (hasJeonseDeposit) {
        prices.push(`전세: ${Number(pin.jeonse_deposit).toLocaleString()} 만원`);
      } else if (hasJeonsePremium) {
        prices.push(`전세: (권리금: ${Number(pin.jeonse_premium).toLocaleString()} 만원)`);
      }
    }
    if (pin.is_rent && (hasRentDeposit || hasRentAmount)) {
      const deposit = Number(pin.rent_deposit || 0).toLocaleString();
      const amount = Number(pin.rent_amount || 0).toLocaleString();
      prices.push(`월세: ${deposit} / ${amount} 만원`);
    }
    
    if (prices.length === 0) {
      return '<div>가격 정보 없음</div>';
    }
    return prices.map(p => `<div>${p}</div>`).join('');
  };
  // (getAddressFromCoords ... 변경 없음)
  const getAddressFromCoords = (lat, lng) => {
    // ... (변경 없음) ...
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
  // (fetchPins, fetchCustomers, fetchLinkedCustomers ... 변경 없음)
  const fetchPins = async () => {
    // ... (변경 없음) ...
    setLoading(true);
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (error) console.error('핀 로드 오류:', error.message);
    else setPins(data || []);
    setLoading(false);
  };
  const fetchCustomers = async () => {
    // ... (변경 없음) ...
    const { data, error } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (error) console.error('고객 리스트 로드 오류:', error.message);
    else setCustomers(data || []);
  };
  const fetchLinkedCustomers = async (pinId) => {
    // ... (변경 없음) ...
    if (!pinId) { setLinkedCustomers([]); return; }
    const { data, error } = await supabase.from('customer_pins').select(` id, customer:customers ( id, name ) `).eq('pin_id', pinId);
    if (error) console.error('연결된 고객 로드 오류:', error.message);
    else setLinkedCustomers(data || []);
  };
  // (createMarkerElement, createStackedMarkerElement ... 변경 없음)
  const createMarkerElement = (pin) => {
    // ... (변경 없음) ...
    const typeText = pin.property_type || '유형없음';
    const keywordText = (pin.keywords || '')
      .split(',').map(k => k.trim().replace(/^#/, '')).filter(k => k).join(', ');
    let statusClass = styles.statusBefore;
    if (pin.status === '거래중') statusClass = styles.statusInProgress;
    else if (pin.status === '거래완료') statusClass = styles.statusComplete;
    
    const wrap = document.createElement('div');
    wrap.className = styles.customOverlay;
    const top = document.createElement('div');
    top.className = styles.overlayTop;
    top.textContent = typeText;
    if (pin.property_type === '기타' && pin.property_type_etc) {
      top.textContent = `${typeText} (${pin.property_type_etc})`;
    }
    const bottom = document.createElement('div');
    bottom.className = `${styles.overlayBottom} ${statusClass}`;
    bottom.textContent = keywordText || '키워드';
    wrap.appendChild(top);
    wrap.appendChild(bottom);
    return wrap;
  };
  const createStackedMarkerElement = (stack) => {
    // ... (변경 없음) ...
    const wrap = document.createElement('div');
    wrap.className = styles.customOverlay; 
    
    const top = document.createElement('div');
    top.className = styles.overlayTop;
    top.textContent = "매물 스택"; 
    top.style.backgroundColor = "#f97316"; 
    top.style.color = "white";

    const bottom = document.createElement('div');
    bottom.className = styles.overlayBottom; 
    bottom.style.backgroundColor = "#f97316"; 
    bottom.style.color = "white";
    bottom.textContent = `📍 ${stack.length}개 매물`;
    
    wrap.appendChild(top);
    wrap.appendChild(bottom);
    return wrap;
  };
  // (handlePinContextMenu ... 변경 없음)
  const handlePinContextMenu = (e, pin, isStack = false) => {
    // ... (변경 없음) ...
    e.preventDefault();
    e.stopPropagation(); 
    
    const pinKey = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
    const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);

    clearTempMarkerAndMenu();
    
    if (!isStack) {
      setActiveOverlayKey(pinKey);
      setSelectedPin(pin);
      setIsEditMode(false); 
      setAddress(pin.address || '');
      setDetailedAddress(pin.detailed_address || '');
      setBuildingName(pin.building_name || '');
      setPropertyType(pin.property_type || ''); 
      setPropertyTypeEtc(pin.property_type_etc || ''); 
      setIsSale(pin.is_sale || false);
      setSalePrice(pin.sale_price !== null ? String(pin.sale_price) : ''); 
      setIsJeonse(pin.is_jeonse || false);
      setJeonseDeposit(pin.jeonse_deposit !== null ? String(pin.jeonse_deposit) : ''); 
      setJeonsePremium(pin.jeonse_premium !== null ? String(pin.jeonse_premium) : ''); 
      setIsRent(pin.is_rent || false);
      setRentDeposit(pin.rent_deposit !== null ? String(pin.rent_deposit) : ''); 
      setRentAmount(pin.rent_amount !== null ? String(pin.rent_amount) : ''); 
      setKeywords(pin.keywords || '');
      setNotes(pin.notes || '');
      setStatus(pin.status || '거래전');
      setImageUrls(pin.image_urls || ['', '', '']);
      setImageFiles([null, null, null]);
      setValidationErrors([]); 
      fetchLinkedCustomers(pin.id);
      setImContent(null);
      setViewingImage(null);
      setExpandedStackKeys(new Set()); 
      setIsListForced(true);
      setListTitle(`[1개] ${pin.building_name || pin.address || '선택된 매물'}`);
      setVisiblePins([pin]);
      
      if (mapInstanceRef.current && window.kakao) {
          mapInstanceRef.current.panTo(position);
      }
    } else {
      const stackHeader = {
          isStackHeader: true, 
          isStack: true,
          count: pin.pins.length,
          id: pinKey, 
          lat: pin.lat,
          lng: pin.lng,
          address: pin.address,
          keywords: pin.keywords,
          pins: pin.pins,
      };
      setIsListForced(true); 
      setListTitle(`[${pin.pins.length}개] ${pin.address || '매물'}`);
      setActiveOverlayKey(pinKey); 
      setVisiblePins([stackHeader, ...pin.pins]);
      setSelectedPin(null);
      
      if (mapInstanceRef.current && window.kakao) {
          mapInstanceRef.current.panTo(position);
      }
    }

    let contextX = e.clientX;
    let contextY = e.clientY;
    
    if (mapRef.current) {
        const mapSectionRect = mapRef.current.parentElement.getBoundingClientRect();
        contextX = e.clientX - mapSectionRect.left;
        contextY = e.clientY - mapSectionRect.top;
    }
    
    const contextMenuData = {
        visible: true, 
        latLng: position, 
        x: contextX, 
        y: contextY, 
        pinId: pin.id, 
        isStack: isStack,
        pins: isStack ? pin.pins : null
    };

    setTimeout(() => {
        setContextMenu(contextMenuData);
    }, 150); 
  };
  // (drawMarkers ... 변경 없음)
  const drawMarkers = (map, pinData) => {
    // ... (변경 없음) ...
    if (!window.kakao || !map || !clustererRef.current) return;
    
    if (!infowindowRef.current && window.kakao.maps.CustomOverlay) {
      const iwContent = document.createElement('div');
      iwContent.className = styles.infowindow;
      const priceContent = document.createElement('div');
      priceContent.className = styles.infowindowPrice;
      const notesContent = document.createElement('div');
      notesContent.className = styles.infowindowNotes;
      iwContent.appendChild(priceContent);
      iwContent.appendChild(notesContent);
      infowindowRef.current = new window.kakao.maps.CustomOverlay({
        content: iwContent, map: null, position: null, zIndex: 10,
        yAnchor: 0.8, xAnchor: -0.15, offsetX: 40 
      });
    }
    const infowindow = infowindowRef.current;
    if (!infowindow) return;

    const pinsByLocation = new Map();
    pinData.forEach(pin => {
        const key = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
        if (!pinsByLocation.has(key)) {
            pinsByLocation.set(key, []);
        }
        pinsByLocation.get(key).push(pin);
    });

    const overlays = []; 
    overlayDOMsRef.current.clear();
    
    pinsByLocation.forEach((stack, key) => {
        const pin = stack[0]; 
        const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
        let contentElement;

        if (stack.length === 1) {
            contentElement = createMarkerElement(pin); 
            
            contentElement.addEventListener('click', () => {
                if (infowindow) infowindow.setMap(null);
                clearTempMarkerAndMenu(); 
                
                setExpandedStackKeys(new Set()); 

                setIsListForced(true); 
                setListTitle(`[1개] ${pin.building_name || pin.address || '선택된 매물'}`);
                setVisiblePins([pin]);

                setSelectedPin(pin); 
                setIsEditMode(false); 
                setActiveOverlayKey(key); 

                setAddress(pin.address || '');
                setDetailedAddress(pin.detailed_address || '');
                setBuildingName(pin.building_name || '');
                setPropertyType(pin.property_type || '');
                setPropertyTypeEtc(pin.property_type_etc || '');
                setIsSale(pin.is_sale || false);
                setSalePrice(pin.sale_price !== null ? String(pin.sale_price) : '');
                setIsJeonse(pin.is_jeonse || false);
                setJeonseDeposit(pin.jeonse_deposit !== null ? String(pin.jeonse_deposit) : '');
                setJeonsePremium(pin.jeonse_premium !== null ? String(pin.jeonse_premium) : '');
                setIsRent(pin.is_rent || false);
                setRentDeposit(pin.rent_deposit !== null ? String(pin.rent_deposit) : '');
                setRentAmount(pin.rent_amount !== null ? String(pin.rent_amount) : '');
                setKeywords(pin.keywords || '');
                setNotes(pin.notes || '');
                setStatus(pin.status || '거래전');
                setImageUrls(pin.image_urls || ['', '', '']);
                setImageFiles([null, null, null]);
                fetchLinkedCustomers(pin.id);
                setImContent(null);
                setViewingImage(null);
                setValidationErrors([]);
            });

            contentElement.addEventListener('contextmenu', (e) => {
                handlePinContextMenu(e, pin, false);
            });

            contentElement.addEventListener('mouseenter', () => {
              if (!infowindow) return;
              const iwContent = infowindow.getContent();
              const priceEl = iwContent.querySelector(`.${styles.infowindowPrice}`);
              const notesEl = iwContent.querySelector(`.${styles.infowindowNotes}`);
              if (priceEl) priceEl.innerHTML = formatPriceForInfowindow(pin);
              if (notesEl) notesEl.textContent = pin.notes || '상세 메모 없음';
              infowindow.setPosition(position);
              infowindow.setMap(map);
            });
            contentElement.addEventListener('mouseleave', () => {
              if (infowindow) infowindow.setMap(null);
            });

        } else {
            contentElement = createStackedMarkerElement(stack); 
            
            contentElement.addEventListener('click', () => {
                if (infowindow) infowindow.setMap(null);
                clearTempMarkerAndMenu(); 
                setSelectedPin(null); 
                
                setExpandedStackKeys(new Set()); 

                setIsListForced(true); 
                setListTitle(`[${stack.length}개] ${pin.building_name || pin.address || '매물'}`);
                setActiveOverlayKey(key); 
                
                const stackHeader = {
                    isStackHeader: true, 
                    isStack: true,
                    count: stack.length,
                    id: key, 
                    lat: pin.lat,
                    lng: pin.lng,
                    address: pin.building_name || pin.address || '매물 묶음',
                    keywords: `${stack.length}개 매물`,
                    pins: stack,
                };
                
                setVisiblePins([stackHeader, ...stack]);
            });

            contentElement.addEventListener('contextmenu', (e) => {
                handlePinContextMenu(e, { ...pin, pins: stack, id: pin.id }, true);
            });

            contentElement.addEventListener('mouseenter', () => {
                if (!infowindow) return;
                const iwContent = infowindow.getContent();
                const priceEl = iwContent.querySelector(`.${styles.infowindowPrice}`);
                const notesEl = iwContent.querySelector(`.${styles.infowindowNotes}`);
                if (priceEl) priceEl.innerHTML = `<strong>${stack.length}개</strong>의 매물이 있습니다.`;
                if (notesEl) notesEl.textContent = "클릭하여 왼쪽 목록에서 확인하세요.";
                infowindow.setPosition(position);
                infowindow.setMap(map);
            });
            contentElement.addEventListener('mouseleave', () => {
                if (infowindow) infowindow.setMap(null);
            });
        }

        if (activeOverlayKey === key) {
          contentElement.classList.add(styles.active);
        }
        
        overlayDOMsRef.current.set(key, contentElement);

        const overlay = new window.kakao.maps.CustomOverlay({
            position: position,
            content: contentElement,
            yAnchor: 1, 
            zIndex: 3
        });
        
        overlays.push(overlay); 
    });

    clustererRef.current.clear(); 
    clustererRef.current.addMarkers(overlays); 
  };

  // (clearTempMarkerAndMenu ... 변경 없음)
  const clearTempMarkerAndMenu = () => {
    // ... (변경 없음) ...
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
    setContextMenu({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
    
    if (infowindowRef.current) {
      infowindowRef.current.setMap(null);
    }
    
    if (selectedPin && !selectedPin.id) {
      setSelectedPin(null);
    }
    
    setIsEditMode(false); 
    setValidationErrors([]); 
    setIsAddingToStack(false);
  };
  // (handleCreatePin, handleDeletePin, handleUpdatePin ... 변경 없음)
  const handleCreatePin = async (newPinData) => {
    // ... (변경 없음) ...
    setLoading(true);
    const { data, error } = await supabase.from('pins').insert(newPinData).select().single();
    if (error) {
      console.error('핀 생성 오류:', error.message);
      setLoading(false);
      return null;
    } else {
      const createdPin = data;
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
        tempMarkerRef.current = null;
      }
      setContextMenu({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
      
      const newKey = `${Number(createdPin.lat).toFixed(4)},${Number(createdPin.lng).toFixed(4)}`;
      setActiveOverlayKey(newKey);

      return createdPin;
    }
  };
  const handleDeletePin = async (pinId) => {
    // ... (변경 없음) ...
    if (infowindowRef.current) {
      infowindowRef.current.setMap(null);
    }
    setLoading(true);
    const { error } = await supabase.from('pins').delete().eq('id', pinId);
    if (error) console.error('핀 삭제 오류:', error.message);
    else {
      setPins(currentPins => currentPins.filter(p => p.id !== pinId)); 
      setSelectedPin(null);
      handleRemoveFromTour(pinId);
      
      setExpandedStackKeys(new Set());
      setIsListForced(false);
      setActiveOverlayKey(null);
    }
    setLoading(false);
  };
  const handleUpdatePin = async (pinId, updatedData) => {
    // ... (변경 없음) ...
    setLoading(true);
    const { data, error } = await supabase.from('pins').update(updatedData).eq('id', pinId).select().single();
    if (error) {
      console.error('핀 수정 오류:', error.message);
      setLoading(false);
      return null;
    } else {
      const updatedPin = data;
      setTourPins(currentTourPins =>
        currentTourPins.map(p => (p.id === pinId ? updatedPin : p))
      );
      return updatedPin;
    }
  };
  // (handleLinkCustomer, handleUnlinkCustomer, searchNearby, handleGenerateIm ... 변경 없음)
  const handleLinkCustomer = async (pinId, customerId) => {
    // ... (변경 없음) ...
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
    // ... (변경 없음) ...
    setLoading(true);
    const { error } = await supabase.from('customer_pins').delete().eq('id', linkId);
    if (error) console.error('고객 연결 해제 오류:', error.message);
    else setLinkedCustomers(currentLinks => currentLinks.filter(link => link.id !== linkId));
    setLoading(false);
  };
  const searchNearby = (ps, keyword, lat, lng) => {
    // ... (변경 없음) ...
    return new Promise((resolve) => {
      const options = { location: new window.kakao.maps.LatLng(lat, lng), radius: 3000, sort: window.kakao.maps.services.SortBy.DISTANCE, size: 5 };
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) resolve(data.map(place => place.place_name));
        else resolve([]);
      }, options);
    });
  };
  const handleGenerateIm = async (pin) => {
    // ... (변경 없음) ...
    if (isGenerating) return;
    setIsGenerating(true); setLoading(true); setImContent(null);
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
        searchNearby(ps, '지하철역', pin.lng)
      ]);
      realData = `[교육] ${schools.join(', ')} [마트] ${marts.join(', ')} [병원] ${hospitals.join(', ')} [교통] ${subways.join(', ')}`;
    } catch (searchError) { realData = "[데이터 로드 실패]"; }
    const systemPrompt = `당신은 숙련된 부동산 입지 분석가입니다. 제공된 실제 주변 시설 데이터를 바탕으로 전문적이고 신뢰감 있는 브리핑 리포트를 작성합니다.`;
    const userQuery = `다음은 매물(좌표: ${pin.lat}, ${pin.lng}) 3km 이내 '실제 시설 목록'입니다. 이 데이터를 바탕으로 브리핑 리포트를 작성해 주세요. \n--- \n[실제 시설 목록]\n ${realData} \n--- \n[추가 참고 사항]\n키워드: ${pin.keywords || '없음'}\n상세메모: ${pin.notes || '없음'}\n--- \n리포트:`;
    const payload = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: 'user', parts: [{ text: userQuery }] }], };
    if (!API_KEY) { setImContent("API 키가 없습니다."); setIsGenerating(false); setLoading(false); return; }
    try {
      const response = await exponentialBackoffFetch(`${API_URL}${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText) setImContent(generatedText);
      else setImContent("AI 요약 리포트 생성 실패.");
    } catch (error) { setImContent(`AI 리포트 생성 오류: ${error.message}`);
    } finally { setLoading(false); }
  };
  // (handleAddToTour, handleRemoveFromTour, handleClearTour, handleOptimizeTour ... 변경 없음)
  const handleAddToTour = (pinToAdd) => {
    // ... (변경 없음) ...
    if (!pinToAdd) return;
    if (tourPins.find(p => p.id === pinToAdd.id)) { alert("이미 임장 목록에 추가된 매물입니다."); return; }
    setTourPins(prev => [...prev, pinToAdd]);
    setSelectedPin(null);
    setExpandedStackKeys(new Set());
    setIsListForced(false);
    setActiveOverlayKey(null);
    handleMapMove(false);
  };
  const handleRemoveFromTour = (pinId) => {
    // ... (변경 없음) ...
    setTourPins(prev => prev.filter(p => p.id !== pinId));
    if (routeLine) { routeLine.setMap(null); setRouteLine(null); }
  };
  const handleClearTour = () => {
    // ... (변경 없음) ...
    setTourPins([]);
    if (routeLine) { routeLine.setMap(null); setRouteLine(null); }
  };
  const handleOptimizeTour = async () => {
    // ... (변경 없음) ...
    if (tourPins.length < 2) { alert("경로를 최적화하려면 2개 이상의 매물을 목록에 추가해야 합니다."); return; }
    if (!window.kakao.maps.services || !window.kakao.maps.services.Directions) { alert("카카오맵 'services.Directions' 라이브러리 로딩에 실패했습니다."); return; }
    setLoading(true);
    try {
      const d = new window.kakao.maps.services.Directions();
      const origin = { x: tourPins[0].lng, y: tourPins[0].lat };
      const destination = { x: tourPins[tourPins.length - 1].lng, y: tourPins[tourPins.length - 1].lat };
      const waypoints = tourPins.slice(1, -1).map(p => ({ x: p.lng, y: p.lat }));
      const request = { origin, destination, waypoints, optimize: true };
      const result = await new Promise((resolve, reject) => { d.route(request, (result, status) => { if (status === window.kakao.maps.services.Status.OK) resolve(result); else reject(new Error(`API 실패: ${status}`)); }); });
      const route = result.routes[0];
      if (route) {
        if (routeLine) { routeLine.setMap(null); }
        const polyline = new window.kakao.maps.Polyline({ path: route.polyline.getPath(), strokeWeight: 6, strokeColor: '#FF0000', strokeOpacity: 0.8, strokeStyle: 'solid' });
        polyline.setMap(mapInstanceRef.current);
        setRouteLine(polyline);
        const optimizedWaypoints = route.waypoint_order.map(idx => tourPins.slice(1, -1)[idx]);
        setTourPins([tourPins[0], ...optimizedWaypoints, tourPins[tourPins.length - 1]]);
        alert(`총 거리: ${(route.summary.distance / 1000).toFixed(1)}km, 예상 시간: ${Math.round(route.summary.duration / 60)}분 (최적화 완료)`);
      }
    } catch (error) { console.error('임장 동선 최적화 오류:', error); alert(`경로 탐색 중 오류가 발생했습니다: ${error.message}`);
    } finally { setLoading(false); }
  };
  // (handleOpenCreateInStack ... 변경 없음)
  const handleOpenCreateInStack = async (lat, lng) => {
    // ... (변경 없음) ...
    if (infowindowRef.current) {
      infowindowRef.current.setMap(null);
    }
    if (!lat || !lng) return;
    clearTempMarkerAndMenu(); 
    setLoading(true);
    const fetchedAddress = await getAddressFromCoords(lat, lng);
    setLoading(false);
    const tempPinData = { id: null, lat: lat, lng: lng };
    setSelectedPin(tempPinData);
    setIsAddingToStack(true); 
    
    setExpandedStackKeys(new Set());
    setIsListForced(true);
    setListTitle("추가 매물 등록 중"); 
    setVisiblePins([]); 
    setIsEditMode(true); 
    setAddress(fetchedAddress);
    setDetailedAddress('');
    setBuildingName('');
    setPropertyType('');
    setPropertyTypeEtc('');
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
    setValidationErrors([]); 
  };
  // (handleContextMenuAction ... 변경 없음)
  const handleContextMenuAction = async (action) => {
    // ... (변경 없음) ...
    if (action !== 'close') {
      setContextMenu({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
    }
    
    if (infowindowRef.current) {
      infowindowRef.current.setMap(null);
    }
    if (!contextMenu.latLng) return;
    
    if (action === 'createPin') {
      const lat = contextMenu.latLng.getLat();
      const lng = contextMenu.latLng.getLng();
      setLoading(true);
      const fetchedAddress = await getAddressFromCoords(lat, lng);
      setLoading(false);
      const tempPinData = { id: null, lat: lat, lng: lng };
      setSelectedPin(tempPinData);
      setIsAddingToStack(false);
      
      setExpandedStackKeys(new Set());
      setIsListForced(true);
      setListTitle("새 매물 등록 중"); 
      setVisiblePins([]); 
      setIsEditMode(true); 
      setAddress(fetchedAddress);
      setDetailedAddress('');
      setBuildingName('');
      setPropertyType('');
      setPropertyTypeEtc('');
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
      setValidationErrors([]); 
    } 
    else if (action === 'editPin' && contextMenu.pinId) { 
        setIsEditMode(true);
    } 
    else if (action === 'deletePin' && contextMenu.pinId && !contextMenu.isStack) {
        if (window.confirm('선택된 매물을 정말로 삭제하시겠습니까?')) {
            await handleDeletePin(contextMenu.pinId);
        }
    }
    else if (action === 'addPinToStack' && contextMenu.pinId) {
      const lat = contextMenu.latLng.getLat();
      const lng = contextMenu.latLng.getLng();
      await handleOpenCreateInStack(lat, lng);
    }
  };
  // (uploadFile ... 변경 없음)
  const uploadFile = async (file, pinId) => {
    // ... (변경 없음) ...
    if (!file) return null;
    const fileExt = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${pinId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('pins_photos').upload(filePath, file);
    if (uploadError) { console.error('Upload error:', uploadError.message); return null; }
    const { data } = supabase.storage.from('pins_photos').getPublicUrl(filePath);
    return data.publicUrl;
  };
  // (handleSidebarSave ... 변경 없음)
  const handleSidebarSave = async (event) => {
    // ... (변경 없음) ...
    event.preventDefault();
    if (!selectedPin) return;

    setValidationErrors([]); 
    const errors = [];
    if (!propertyType || propertyType.trim() === '') {
      errors.push('매물 유형');
    }
    if (!isSale && !isJeonse && !isRent) {
      errors.push('거래 유형 (매매/전세/월세 중 1개 이상)');
    }
    if (!keywords || keywords.trim() === '') {
      errors.push('키워드');
    }
    if (errors.length > 0) {
      setValidationErrors(errors); 
      return; 
    }

    setIsUploading(true);
    const parseNum = (val) => {
        if (val === '') return null;
        const num = Number(val);
        return isNaN(num) ? null : num;
    };
    const pinData = {
      address: address,
      detailed_address: detailedAddress,
      building_name: buildingName,
      property_type: propertyType,
      property_type_etc: propertyType === '기타' ? propertyTypeEtc : '',
      is_sale: isSale,
      sale_price: parseNum(salePrice),
      is_jeonse: isJeonse,
      jeonse_deposit: parseNum(jeonseDeposit),
      jeonse_premium: parseNum(jeonsePremium),
      is_rent: isRent,
      rent_deposit: parseNum(rentDeposit),
      rent_amount: parseNum(rentAmount),
      keywords: keywords,
      notes: notes,
      status: status,
      user_id: session.user.id
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
        const newUrl = await uploadFile(imageFiles[i], savedPin.id);
        if (newUrl) { newImageUrls[i] = newUrl; hasNewUploads = true; }
      } else if (newImageUrls[i] === 'remove') {
        newImageUrls[i] = ''; hasNewUploads = true;
      }
    }
    if (hasNewUploads) {
      const { data: updatedPin, error: updateImageError } = await supabase.from('pins').update({ image_urls: newImageUrls }).eq('id', savedPin.id).select().single();
      if (updateImageError) console.error('이미지 URL 업데이트 오류:', updateImageError.message);
      else savedPin = updatedPin;
    }
    
    const { data: latestPins, error: fetchError } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (fetchError) {
        console.error('핀 목록 재로드 오류:', fetchError.message);
        setPins(currentPins => currentPins.map(p => (p.id === savedPin.id ? savedPin : p)));
    } else {
        setPins(latestPins || []);
    }
    const allPinsForStackCheck = latestPins || pins;

    const stackList = getVisiblePinsAtLocation(savedPin.lat, savedPin.lng, allPinsForStackCheck);

    setIsUploading(false);
    setLoading(false);
    setSelectedPin(savedPin);
    setAddress(savedPin.address || '');
    setDetailedAddress(savedPin.detailed_address || '');
    setBuildingName(savedPin.building_name || '');
    setPropertyType(savedPin.property_type || '');
    setPropertyTypeEtc(savedPin.property_type_etc || '');
    setStatus(savedPin.status || '거래전');
    setSalePrice(savedPin.sale_price !== null ? String(savedPin.sale_price) : '');
    setJeonseDeposit(savedPin.jeonse_deposit !== null ? String(savedPin.jeonse_deposit) : '');
    setJeonsePremium(savedPin.jeonse_premium !== null ? String(savedPin.jeonse_premium) : '');
    setRentDeposit(savedPin.rent_deposit !== null ? String(savedPin.rent_deposit) : '');
    setRentAmount(savedPin.rent_amount !== null ? String(savedPin.rent_amount) : '');
    setImageUrls(savedPin.image_urls || ['', '', '']);
    setImageFiles([null, null, null]);
    setIsEditMode(false); 
    setIsAddingToStack(false);

    setExpandedStackKeys(new Set()); 
    setIsListForced(true);
    setActiveOverlayKey(`${Number(savedPin.lat).toFixed(4)},${Number(savedPin.lng).toFixed(4)}`);

    if (stackList.length === 1) {
        setListTitle(`[1개] ${savedPin.building_name || savedPin.address || '저장된 매물'}`);
        setVisiblePins(stackList);
    } else if (stackList.length > 1) {
        setListTitle(`[${stackList[0].count}개] ${stackList[0].address || '매물'}`);
        setVisiblePins(stackList);
    } else {
        setListTitle("지도 내 매물");
        setVisiblePins([]);
    }
  };
  // (handleImageChange, handleImageRemove ... 변경 없음)
  const handleImageChange = async (index, file) => {
    // ... (변경 없음) ...
    if (!file) return;
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/webp' };
    try {
      setIsUploading(true);
      const compressedFile = await imageCompression(file, options);
      const newFiles = [...imageFiles]; newFiles[index] = compressedFile; setImageFiles(newFiles);
      const newUrls = [...imageUrls]; newUrls[index] = URL.createObjectURL(compressedFile); setImageUrls(newUrls);
    } catch (error) { console.error('이미지 압축 실패:', error); alert('이미지 압축에 실패했습니다.');
    } finally { setIsUploading(false); }
  };
  const handleImageRemove = (index) => {
    // ... (변경 없음) ...
    const newFiles = [...imageFiles]; newFiles[index] = null; setImageFiles(newFiles);
    const newUrls = [...imageUrls];
    if (imageUrls[index] && !imageUrls[index].startsWith('blob:')) newUrls[index] = 'remove';
    else newUrls[index] = '';
    setImageUrls(newUrls);
  };
  
  // (toggleRoadview ... 변경 없음)
  const toggleRoadview = (mode = 'MAP') => {
      // 'PIN' mode: 왼쪽 패널 (오버레이X, 맵클릭X)
      // 'MAP' mode: 지도 우측 버튼 (오버레이O, 맵클릭O)
      setRoadviewMode(prev => (prev === mode ? 'OFF' : mode));
  };


  // --- Context Value (★ 수정) ---
  const value = {
    // State
    pins, 
    loading, setLoading, selectedPin, setSelectedPin,
    address, setAddress, detailedAddress, setDetailedAddress, buildingName, setBuildingName,
    propertyType, setPropertyType, propertyTypeEtc, setPropertyTypeEtc,
    isSale, setIsSale, salePrice, setSalePrice,
    isJeonse, setIsJeonse, jeonseDeposit, setJeonseDeposit, jeonsePremium, setJeonsePremium,
    isRent, setIsRent, rentDeposit, setRentDeposit, rentAmount, setRentAmount,
    keywords, setKeywords, notes, setNotes, status, setStatus,
    imageFiles, setImageFiles, imageUrls, setImageUrls, isUploading, setIsUploading,
    viewingImage, setViewingImage,
    
    activeMapType, setActiveMapType, 
    
    // ★ [수정] roadviewMode, setRoadviewMode
    roadviewMode, setRoadviewMode,
    // ★ [추가] 기존 showRoadview를 사용하던 컴포넌트를 위한 파생 상태
    showRoadview: roadviewMode !== 'OFF', 

    customers, setCustomers, linkedCustomers, setLinkedCustomers,
    imContent, setImContent, isGenerating, setIsGenerating,
    tourPins, setTourPins, routeLine, setRouteLine, contextMenu, setContextMenu,
    
    filterPropertyType, setFilterPropertyType, 
    filterTransactionType, setFilterTransactionType,
    filterStatus, setFilterStatus,
    
    visiblePins, setVisiblePins,
    
    isLeftPanelOpen, setIsLeftPanelOpen, 
    
    validationErrors, 
    
    listTitle, setListTitle, 
    isListForced, setIsListForced, 
    
    isEditMode, setIsEditMode, 
    
    activeOverlayKey, setActiveOverlayKey, 
    
    isAddingToStack, 
    
    expandedStackKeys, setExpandedStackKeys,
    
    // ★ [추가] 
    pinBeforeRoadview, setPinBeforeRoadview,

    // Refs
    tempMarkerRef, mapInstanceRef, 
    clustererRef, 
    contextMenuRef, mapRef,
    
    // Handlers
    fetchPins, fetchCustomers, fetchLinkedCustomers,
    drawMarkers, clearTempMarkerAndMenu,
    handleCreatePin, handleDeletePin, handleUpdatePin,
    handleLinkCustomer, handleUnlinkCustomer,
    searchNearby, handleGenerateIm,
    handleAddToTour, handleRemoveFromTour, handleClearTour, handleOptimizeTour,
    
    handleOpenCreateInStack, 
    
    handleContextMenuAction, handleSidebarSave,
    handleImageChange, handleImageRemove,
    
    toggleRoadview, 
    
    handleMapMove, 
    
    handlePinContextMenu,

    // Props
    session, mode
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}