// src/contexts/MapContext.jsx (수정)
import React, { createContext, useContext, useState, useRef, useEffect } from 'react'; 
import { supabase } from '../supabaseClient.js';
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
    visible: false, latLng: null, x: 0, y: 0
  });
  const [viewingImage, setViewingImage] = useState(null);
  const [activeMapType, setActiveMapType] = useState('NORMAL');
  const [showRoadview, setShowRoadview] = useState(false);
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

  // --- ★ (추가) 활성화된 핀(오버레이) 추적용 State ---
  const [activeOverlayKey, setActiveOverlayKey] = useState(null);

  // --- Refs ---
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null); 
  const contextMenuRef = useRef(null);
  const mapRef = useRef(null);
  const infowindowRef = useRef(null);
  
  // --- ★ (추가) 생성된 오버레이 DOM 저장용 Ref ---
  const overlayDOMsRef = useRef(new Map());


  // --- (handleMapMove ... 변경 없음) ---
  const handleMapMove = (isForced) => {
    if (isForced) return;

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

  // --- (필터/핀 데이터 로딩 useEffect ... 변경 없음) ---
  useEffect(() => {
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
    if (mapInstanceRef.current) {
      drawMarkers(mapInstanceRef.current, filteredPins);
    }
    handleMapMove(isListForced);
  }, [filteredPins]);
  
  // --- ★ (추가) activeOverlayKey 변경 시 CSS 클래스 적용 ---
  useEffect(() => {
    // 1. 모든 핀의 'active' 클래스 우선 제거
    overlayDOMsRef.current.forEach((element) => {
      element.classList.remove(styles.active);
    });

    // 2. activeOverlayKey에 해당하는 핀이 있다면 'active' 클래스 추가
    if (activeOverlayKey) {
      const activeElement = overlayDOMsRef.current.get(activeOverlayKey);
      if (activeElement) {
        activeElement.classList.add(styles.active);
      }
    }
  }, [activeOverlayKey]); // activeOverlayKey가 바뀔 때마다 실행


  // --- Handlers ---

  // (formatPriceForInfowindow ... 변경 없음)
  const formatPriceForInfowindow = (pin) => {
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
      prices.push(`월세: ${Number(pin.rent_deposit || 0).toLocaleString()} / ${Number(pin.rent_amount || 0).toLocaleString()}`);
    }
    if (prices.length === 0) {
      return '<span>가격 정보 없음</span>';
    }
    return prices.join('<br>');
  };
  // (getAddressFromCoords ... 변경 없음)
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
  // (fetchPins ... 변경 없음)
  const fetchPins = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (error) console.error('핀 로드 오류:', error.message);
    else setPins(data || []);
    setLoading(false);
  };
  // (fetchCustomers ... 변경 없음)
  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customers').select('id, name, phone').order('name', { ascending: true });
    if (error) console.error('고객 리스트 로드 오류:', error.message);
    else setCustomers(data || []);
  };
  // (fetchLinkedCustomers ... 변경 없음)
  const fetchLinkedCustomers = async (pinId) => {
    if (!pinId) { setLinkedCustomers([]); return; }
    const { data, error } = await supabase.from('customer_pins').select(` id, customer:customers ( id, name ) `).eq('pin_id', pinId);
    if (error) console.error('연결된 고객 로드 오류:', error.message);
    else setLinkedCustomers(data || []);
  };
  // (createMarkerElement ... 변경 없음)
  const createMarkerElement = (pin) => {
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
  // (createStackedMarkerElement ... 변경 없음)
  const createStackedMarkerElement = (stack) => {
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


  // --- ★ (수정) drawMarkers (activeOverlayKey 설정 및 DOM 저장) ---
  const drawMarkers = (map, pinData) => {
    if (!window.kakao || !map || !clustererRef.current) return;
    
    // (툴팁 생성... 변경 없음)
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

    // (스태킹 로직... 변경 없음)
    const pinsByLocation = new Map();
    pinData.forEach(pin => {
        const key = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
        if (!pinsByLocation.has(key)) {
            pinsByLocation.set(key, []);
        }
        pinsByLocation.get(key).push(pin);
    });

    const overlays = []; 
    overlayDOMsRef.current.clear(); // ★ (추가) DOM 참조 맵 초기화
    
    pinsByLocation.forEach((stack, key) => {
        const pin = stack[0]; 
        const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
        let contentElement;

        if (stack.length === 1) {
            // --- A. 핀이 1개인 경우 (일반 HTML 핀) ---
            contentElement = createMarkerElement(pin); 
            
            contentElement.addEventListener('click', () => {
                if (infowindow) infowindow.setMap(null);
                clearTempMarkerAndMenu(); 
                setIsListForced(false); 
                setListTitle("지도 내 매물");
                
                setSelectedPin(pin); 
                setIsEditMode(false); 
                setActiveOverlayKey(key); // ★ (추가) 활성 키 설정

                // (폼 데이터 채우기...)
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
                
                setTimeout(() => handleMapMove(false), 0); 
            });

            // (Hover 이벤트... 변경 없음)
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
            // --- B. 핀이 2개 이상 겹친 경우 (스택 HTML 핀) ---
            contentElement = createStackedMarkerElement(stack); 
            
            contentElement.addEventListener('click', () => {
                if (infowindow) infowindow.setMap(null);
                clearTempMarkerAndMenu();
                setSelectedPin(null); 
                
                setIsListForced(true); 
                setListTitle(`[${stack.length}개] ${pin.building_name || pin.address || '매물'}`);
                setVisiblePins(stack); 
                setActiveOverlayKey(key); // ★ (추가) 활성 키 설정
            });

            // (스택용 Hover 이벤트... 변경 없음)
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

        // ★ (추가) 핀이 현재 활성 핀인지 확인
        if (activeOverlayKey === key) {
          contentElement.classList.add(styles.active);
        }
        
        // ★ (추가) DOM 요소를 Ref에 저장
        overlayDOMsRef.current.set(key, contentElement);

        // (공통) CustomOverlay 객체 생성
        const overlay = new window.kakao.maps.CustomOverlay({
            position: position,
            content: contentElement,
            yAnchor: 1, 
            zIndex: 3
        });
        
        overlays.push(overlay); 
    });

    // --- 3. 클러스터러에 'CustomOverlay' 배열 추가 ---
    clustererRef.current.clear(); 
    clustererRef.current.addMarkers(overlays); 
  };


  // --- ★ (수정) 임시 마커/메뉴 닫기 (activeOverlayKey 초기화) ---
  const clearTempMarkerAndMenu = () => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
    setContextMenu({ visible: false, latLng: null, x: 0, y: 0 });
    if (selectedPin && !selectedPin.id) {
      setSelectedPin(null);
    }
    if (infowindowRef.current) {
      infowindowRef.current.setMap(null);
    }
    
    if (isListForced) {
        setIsListForced(false);
        setListTitle("지도 내 매물");
        setTimeout(() => handleMapMove(false), 0); 
    }
    
    setIsEditMode(false); 
    setValidationErrors([]); 
    setActiveOverlayKey(null); // ★ (추가) 활성 핀 키 초기화
  };

  // (핀 생성... 변경 없음)
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
      setIsEditMode(false); 
      // ★ (추가) 생성된 핀을 활성화
      const newKey = `${Number(createdPin.lat).toFixed(4)},${Number(createdPin.lng).toFixed(4)}`;
      setActiveOverlayKey(newKey);
      return createdPin;
    }
  };

  // (핀 삭제... 변경 없음)
  const handleDeletePin = async (pinId) => {
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
    }
    setLoading(false);
  };

  // (핀 수정... 변경 없음)
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
      return updatedPin;
    }
  };

  // (고객 연결/해제... 변경 없음)
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

  // (주변 검색 헬퍼... 변경 없음)
  const searchNearby = (ps, keyword, lat, lng) => {
    return new Promise((resolve) => {
      const options = { location: new window.kakao.maps.LatLng(lat, lng), radius: 3000, sort: window.kakao.maps.services.SortBy.DISTANCE, size: 5 };
      ps.keywordSearch(keyword, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) resolve(data.map(place => place.place_name));
        else resolve([]);
      }, options);
    });
  };

  // (AI 리포트... 변경 없음)
  const handleGenerateIm = async (pin) => {
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
        searchNearby(ps, '지하철역', pin.lat, pin.lng)
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
    } finally { setIsGenerating(false); setLoading(false); }
  };

  // (임장 동선... 변경 없음)
  const handleAddToTour = (pinToAdd) => {
    if (!pinToAdd) return;
    if (tourPins.find(p => p.id === pinToAdd.id)) { alert("이미 임장 목록에 추가된 매물입니다."); return; }
    setTourPins(prev => [...prev, pinToAdd]);
    setSelectedPin(null);
  };
  const handleRemoveFromTour = (pinId) => {
    setTourPins(prev => prev.filter(p => p.id !== pinId));
    if (routeLine) { routeLine.setMap(null); setRouteLine(null); }
  };
  const handleClearTour = () => {
    setTourPins([]);
    if (routeLine) { routeLine.setMap(null); setRouteLine(null); }
  };
  const handleOptimizeTour = async () => {
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


  // --- (우클릭 메뉴 핸들러 ... 변경 없음) ---
  const handleContextMenuAction = async (action) => {
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
      
      setIsListForced(false);
      setListTitle("지도 내 매물");
      setIsEditMode(true); 

      // (폼 초기화)
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
    setContextMenu({ ...contextMenu, visible: false });
  };

  // (사진 업로드... 변경 없음)
  const uploadFile = async (file, pinId) => {
    if (!file) return null;
    const fileExt = file.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${session.user.id}/${pinId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('pins_photos').upload(filePath, file);
    if (uploadError) { console.error('Upload error:', uploadError.message); return null; }
    const { data } = supabase.storage.from('pins_photos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  
  // (폼 저장 ... 변경 없음)
  const handleSidebarSave = async (event) => {
    event.preventDefault();
    if (!selectedPin) return;

    // (유효성 검사... 변경 없음)
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
    
    // (이미지 업로드 로직... 변경 없음)
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
    
    setIsUploading(false);
    setLoading(false);
    
    setPins(currentPins => currentPins.map(p => (p.id === savedPin.id ? savedPin : p)));
    setSelectedPin(savedPin);
    
    // (폼 상태 업데이트... 변경 없음)
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
    
    setIsEditMode(false); // ★ (추가) 저장 완료 후 '읽기 모드'로 전환
  };


  // (사진 변경/압축... 변경 없음)
  const handleImageChange = async (index, file) => {
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
    const newFiles = [...imageFiles]; newFiles[index] = null; setImageFiles(newFiles);
    const newUrls = [...imageUrls];
    if (imageUrls[index] && !imageUrls[index].startsWith('blob:')) newUrls[index] = 'remove';
    else newUrls[index] = '';
    setImageUrls(newUrls);
  };

  // (지도 컨트롤)
  const toggleRoadview = () => setShowRoadview(prev => !prev);


  // --- Context Value ---
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
    showRoadview, setShowRoadview,
    
    customers, setCustomers, linkedCustomers, setLinkedCustomers,
    imContent, setImContent, isGenerating, setIsGenerating,
    tourPins, setTourPins, routeLine, setRouteLine, contextMenu, setContextMenu,
    
    filterPropertyType, setFilterPropertyType, 
    filterTransactionType, setFilterTransactionType,
    filterStatus, setFilterStatus,
    
    visiblePins, // ★ LeftPanel이 사용할 리스트
    
    isLeftPanelOpen, setIsLeftPanelOpen, 
    
    validationErrors, 
    
    listTitle, 
    isListForced,
    
    isEditMode, setIsEditMode, 
    
    activeOverlayKey, setActiveOverlayKey, // ★ (추가)
    
    // Refs
    tempMarkerRef, mapInstanceRef, 
    clustererRef, 
    contextMenuRef, mapRef,
    // overlayDOMsRef, // ★ (추가) -> 아, 이건 context 내부에서만 쓰므로 export 불필요
    
    // Handlers
    fetchPins, fetchCustomers, fetchLinkedCustomers,
    drawMarkers, clearTempMarkerAndMenu,
    handleCreatePin, handleDeletePin, handleUpdatePin,
    handleLinkCustomer, handleUnlinkCustomer,
    searchNearby, handleGenerateIm,
    handleAddToTour, handleRemoveFromTour, handleClearTour, handleOptimizeTour,
    handleContextMenuAction, handleSidebarSave,
    handleImageChange, handleImageRemove,
    toggleRoadview,
    
    handleMapMove, 
    
    // Props
    session, mode
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}