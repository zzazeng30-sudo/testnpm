import React, { createContext, useContext, useState, useRef, useEffect } from 'react'; 
import { supabase } from '../lib/supabaseClient'; 
import styles from '../features/map/styles/MapOverlays.module.css';

// 투명 마커 이미지
const TRANSPARENT_MARKER_IMAGE_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const MapContext = createContext();

export function useMap() { return useContext(MapContext); }

export function MapProvider({ children, session, mode }) {
  // Refs
  const tempMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const clustererRef = useRef(null); 
  const markersRef = useRef([]); 
  const contextMenuRef = useRef(null);
  const mapRef = useRef(null);
  const overlayDOMsRef = useRef(new Map());
  const prevRoadviewModeRef = useRef('OFF');

  // State
  const [pins, setPins] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  // Form State
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

  const [validationErrors, setValidationErrors] = useState([]);

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
  
  const [proposalPins, setProposalPins] = useState([]);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  
  const [filterPropertyType, setFilterPropertyType] = useState('ALL');
  const [filterTransactionType, setFilterTransactionType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filteredPins, setFilteredPins] = useState([]);

  const [activeMapType, setActiveMapType] = useState('NORMAL');
  const [roadviewMode, setRoadviewMode] = useState('OFF');
  const [pinBeforeRoadview, setPinBeforeRoadview] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
  
  const [customers, setCustomers] = useState([]);
  const [linkedCustomers, setLinkedCustomers] = useState([]);
  const [imContent, setImContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tourPins, setTourPins] = useState([]);
  const [routeLine, setRouteLine] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  // Effects
  useEffect(() => {
    let result = [...pins];
    if (filterPropertyType !== 'ALL') result = result.filter(p => p.property_type === filterPropertyType);
    if (filterTransactionType !== 'ALL') {
        if (filterTransactionType === '매매') result = result.filter(p => p.is_sale);
        else if (filterTransactionType === '전세') result = result.filter(p => p.is_jeonse);
        else if (filterTransactionType === '월세') result = result.filter(p => p.is_rent);
    }
    if (filterStatus !== 'ALL') result = result.filter(p => p.status === filterStatus);
    setFilteredPins(result);
  }, [pins, filterPropertyType, filterTransactionType, filterStatus]);

  useEffect(() => {
    if (isMapReady && mapInstanceRef.current && clustererRef.current) {
      drawMarkers(mapInstanceRef.current, filteredPins);
    }
    if (!isListForced) {
      handleMapMove(false);
    }
  }, [filteredPins, isMapReady, isListForced]);

  useEffect(() => {
    const prevMode = prevRoadviewModeRef.current;
    if (roadviewMode === 'PIN' && prevMode !== 'PIN') {
      if (selectedPin) { setPinBeforeRoadview(selectedPin); setSelectedPin(null); }
    } else if (roadviewMode === 'OFF' && prevMode === 'PIN') {
      if (pinBeforeRoadview) { setSelectedPin(pinBeforeRoadview); setPinBeforeRoadview(null); }
    } else if (roadviewMode !== 'OFF' && selectedPin && pinBeforeRoadview) {
         setPinBeforeRoadview(null);
    }
    prevRoadviewModeRef.current = roadviewMode;
  }, [roadviewMode, selectedPin, pinBeforeRoadview]);

  useEffect(() => { if (!isListForced) setExpandedStackKeys(new Set()); }, [isListForced]);

  useEffect(() => {
    overlayDOMsRef.current.forEach((element) => element.classList.remove(styles.active));
    if (activeOverlayKey) {
      const activeElement = overlayDOMsRef.current.get(activeOverlayKey);
      if (activeElement) activeElement.classList.add(styles.active);
    }
  }, [activeOverlayKey]);

  useEffect(() => {
      if (!mapInstanceRef.current || !isMapReady) return;
      const map = mapInstanceRef.current;
      const syncVisibility = () => {
          markersRef.current.forEach(marker => {
              if (!marker._overlay) return;
              if (marker.getMap()) marker._overlay.setMap(map);
              else marker._overlay.setMap(null);
          });
      };
      window.kakao.maps.event.addListener(map, 'idle', syncVisibility);
      syncVisibility();
      return () => window.kakao.maps.event.removeListener(map, 'idle', syncVisibility);
  }, [mapInstanceRef.current, isMapReady]);


  // Handlers
  const fetchPins = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('pins').select('*').order('created_at', { ascending: false });
    if (error) console.error(error); else setPins(data || []);
    setLoading(false);
  };
  
  const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      setCustomers(data || []);
  };

  const fetchLinkedCustomers = async (pinId) => {
      if (!pinId) { setLinkedCustomers([]); return; }
      const { data, error } = await supabase.from('pin_customers').select('*, customer:customers(*)').eq('pin_id', pinId);
      setLinkedCustomers(error ? [] : data || []);
  };

  const getAddressFromCoords = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps.services) { resolve('서비스 로드 실패'); return; }
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const road = result[0].road_address?.address_name;
          const jibun = result[0].address?.address_name;
          resolve(road || jibun || '주소 정보 없음');
        } else resolve('주소 변환 실패');
      });
    });
  };

  const selectPin = (pin, isStack = false) => {
      const pinKey = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
      setActiveOverlayKey(pinKey);
      
      setIsLeftPanelOpen(true); 
      setIsProposalOpen(false); 

      if (!isStack) {
          setSelectedPin(pin);
          setIsEditMode(false);
          setAddress(pin.address || ''); setDetailedAddress(pin.detailed_address || ''); setBuildingName(pin.building_name || '');
          setPropertyType(pin.property_type || ''); setPropertyTypeEtc(pin.property_type_etc || '');
          setIsSale(pin.is_sale); setSalePrice(pin.sale_price);
          setIsJeonse(pin.is_jeonse); setJeonseDeposit(pin.jeonse_deposit); setJeonsePremium(pin.jeonse_premium);
          setIsRent(pin.is_rent); setRentDeposit(pin.rent_deposit); setRentAmount(pin.rent_amount);
          setKeywords(pin.keywords || ''); setNotes(pin.notes || ''); setStatus(pin.status || '거래전');
          setImageUrls(pin.image_urls || ['', '', '']); setImageFiles([null,null,null]);
          setValidationErrors([]); fetchLinkedCustomers(pin.id);
          
          setExpandedStackKeys(new Set());
          setIsListForced(true);
          setListTitle(`[1개] ${pin.building_name || pin.address}`);
          setVisiblePins([pin]);
      } else {
          setSelectedPin(null);
          setIsListForced(true);
          setListTitle(`[${pin.pins.length}개] ${pin.address || '매물 묶음'}`);
          const stackHeader = {
              isStackHeader: true, isStack: true, count: pin.pins.length, id: pinKey,
              lat: pin.lat, lng: pin.lng, address: pin.address, 
              building_name: pin.pins[0].building_name,
              keywords: '매물 묶음', pins: pin.pins
          };
          setVisiblePins([stackHeader, ...pin.pins]);
      }
  };

  const drawMarkers = (map, pinsToDraw) => {
      markersRef.current.forEach(marker => {
          if (marker._overlay) marker._overlay.setMap(null);
          marker.setMap(null);
      });
      markersRef.current = [];
      if (clustererRef.current) clustererRef.current.clear();
      overlayDOMsRef.current.clear();

      const grouped = new Map();
      pinsToDraw.forEach(pin => {
          const key = `${Number(pin.lat).toFixed(4)},${Number(pin.lng).toFixed(4)}`;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key).push(pin);
      });

      const newMarkers = [];

      grouped.forEach((group, key) => {
          const pin = group[0];
          const position = new window.kakao.maps.LatLng(pin.lat, pin.lng);
          
          const markerImage = new window.kakao.maps.MarkerImage(
              TRANSPARENT_MARKER_IMAGE_URL, 
              new window.kakao.maps.Size(1, 1), 
              { offset: new window.kakao.maps.Point(0, 0) }
          );
          
          const marker = new window.kakao.maps.Marker({ position, image: markerImage, zIndex: 1 });

          const content = document.createElement('div');
          content.className = styles.customOverlay;
          
          if (group.length === 1) {
              let statusClass = styles.statusBefore;
              if (pin.status === '거래중') statusClass = styles.statusInProgress;
              else if (pin.status === '거래완료') statusClass = styles.statusComplete;

              const formatNum = (n) => Number(n || 0).toLocaleString();
              let typeStr = '', priceStr = '';
              if (pin.is_sale) { typeStr = '매매'; priceStr = formatNum(pin.sale_price); }
              else if (pin.is_jeonse) { typeStr = '전세'; priceStr = formatNum(pin.jeonse_deposit); }
              else if (pin.is_rent) { typeStr = '월세'; priceStr = `${formatNum(pin.rent_deposit)}/${formatNum(pin.rent_amount)}`; }
              else { typeStr = pin.property_type || '기타'; priceStr = '-'; }
              
              const keywordText = (pin.keywords || '').split(',').map(k => k.trim().replace(/^#/, '')).filter(k => k).join(', ');

              content.innerHTML = `
                <div class="${styles.overlayTop}"><strong>${typeStr}</strong> ${priceStr}</div>
                <div class="${styles.overlayBottom} ${statusClass}">${keywordText || '키워드 없음'}</div>
              `;
              
              content.addEventListener('click', (e) => { 
                  e.stopPropagation(); 
                  clearTempMarkerAndMenu(); 
                  selectPin(pin, false); 
                  if (mapInstanceRef.current) mapInstanceRef.current.panTo(position);
              });
              
              content.addEventListener('contextmenu', (e) => {
                 e.preventDefault(); e.stopPropagation();
                 clearTempMarkerAndMenu(); 
                 selectPin(pin, false);
                 if (mapInstanceRef.current) mapInstanceRef.current.panTo(position);
                 setContextMenu({ visible: true, latLng: position, x: e.clientX, y: e.clientY, pinId: pin.id, isStack: false });
              });

          } else {
              const stackName = pin.building_name || '건물명 미입력';

              content.innerHTML = `
                <div class="${styles.overlayTop}" style="background-color: #f97316; color: white;">${stackName}</div>
                <div class="${styles.overlayBottom}" style="background-color: #f97316; color: white;">📍 ${group.length}개 매물</div>
              `;

              content.addEventListener('click', (e) => { 
                  e.stopPropagation(); 
                  clearTempMarkerAndMenu(); 
                  selectPin({ ...pin, pins: group }, true);
                  if (mapInstanceRef.current) mapInstanceRef.current.panTo(position);
              });
              
              content.addEventListener('contextmenu', (e) => {
                 e.preventDefault(); e.stopPropagation();
                 clearTempMarkerAndMenu();
                 selectPin({ ...pin, pins: group }, true);
                 if (mapInstanceRef.current) mapInstanceRef.current.panTo(position);
                 setContextMenu({ visible: true, latLng: position, x: e.clientX, y: e.clientY, pinId: pin.id, isStack: true, pins: group });
              });
          }
          
          overlayDOMsRef.current.set(key, content);
          const overlay = new window.kakao.maps.CustomOverlay({ position, content, yAnchor: 1, zIndex: 10, clickable: true });
          marker._overlay = overlay;
          newMarkers.push(marker);
      });
      
      markersRef.current = newMarkers;
      if (clustererRef.current) clustererRef.current.addMarkers(newMarkers);
      
      setTimeout(() => {
          newMarkers.forEach(marker => {
              if (marker.getMap()) marker._overlay.setMap(map); else marker._overlay.setMap(null);
          });
      }, 100);
  };

  const handlePinContextMenu = (e, pin, isStack = false) => {
      if(e.preventDefault) e.preventDefault();
      if(e.stopPropagation) e.stopPropagation();
      clearTempMarkerAndMenu();
      selectPin(pin, isStack); 
      if (mapInstanceRef.current) mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
  };

  const handleMapMove = (isForced) => {
    if (isForced || isListForced) return; 
    
    setListTitle("지도 내 매물");
    if (!mapInstanceRef.current || !filteredPins) { setVisiblePins(filteredPins || []); return; }
    const bounds = mapInstanceRef.current.getBounds();
    const visibleStacks = [];
    const pinsByLocation = new Map();
    const pinsInBounds = filteredPins.filter(pin => {
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
                isStackHeader: true, 
                isStack: true, 
                count: stack.length, 
                id: stack[0].id,
                lat: stack[0].lat, 
                lng: stack[0].lng, 
                address: stack[0].address || '매물 묶음', 
                building_name: stack[0].building_name,
                keywords: `${stack.length}개`, 
                pins: stack
            });
        }
    });
    setVisiblePins(visibleStacks);
  };

  const clearTempMarkerAndMenu = () => {
    if (tempMarkerRef.current) { tempMarkerRef.current.setMap(null); tempMarkerRef.current = null; }
    setContextMenu({ visible: false, latLng: null, x: 0, y: 0, pinId: null, isStack: false });
    if (selectedPin && !selectedPin.id) setSelectedPin(null);
    setIsEditMode(false); setIsAddingToStack(false);
  };

  // ---------------------------------------------------------------------------
  // ★ 1. 이미지 업로드 로직 (버킷 이름: pins_photos 적용)
  // ---------------------------------------------------------------------------
  const uploadImage = async (file) => {
    if (!file) return null;
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        // ✅ 버킷 이름을 pins_photos 로 수정했습니다.
        const { error: uploadError } = await supabase.storage
            .from('pins_photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('pins_photos').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (error) {
        console.error('이미지 업로드 실패:', error.message);
        alert('이미지 업로드 중 오류가 발생했습니다. (Supabase 버킷 pins_photos 확인 필요)');
        return null;
    }
  };

  const handleCreatePin = async (pinData) => { const { data, error } = await supabase.from('pins').insert(pinData).select().single(); return error ? null : data; };
  const handleUpdatePin = async (id, pinData) => { const { data, error } = await supabase.from('pins').update(pinData).eq('id', id).select().single(); return error ? null : data; };
  const handleDeletePin = async (id) => { await supabase.from('pins').delete().eq('id', id); setPins(p => p.filter(x => x.id !== id)); clearTempMarkerAndMenu(); setSelectedPin(null); };
  const handleLinkCustomer = async (pid, cid) => { await supabase.from('pin_customers').insert({pin_id: pid, customer_id: cid}); fetchLinkedCustomers(pid); };
  const handleUnlinkCustomer = async (lid) => { await supabase.from('pin_customers').delete().eq('id', lid); setLinkedCustomers(p => p.filter(l => l.id !== lid)); };
  
  // ★ 2. 저장 로직 수정 (이미지 업로드 포함)
  const handleSidebarSave = async (e) => { 
      e.preventDefault();
      setIsUploading(true); 

      const uploadedUrls = [...imageUrls]; 
      for (let i = 0; i < 3; i++) {
          const file = imageFiles[i];
          if (file) {
              const newUrl = await uploadImage(file);
              if (newUrl) uploadedUrls[i] = newUrl;
          }
      }

      const pinData = { 
          address, detailed_address: detailedAddress, building_name: buildingName, 
          property_type: propertyType, property_type_etc: propertyTypeEtc, 
          is_sale: isSale, sale_price: salePrice || null, 
          is_jeonse: isJeonse, jeonse_deposit: jeonseDeposit || null, jeonse_premium: jeonsePremium || null, 
          is_rent: isRent, rent_deposit: rentDeposit || null, rent_amount: rentAmount || null, 
          keywords, notes, status, 
          user_id: session.user.id,
          image_urls: uploadedUrls 
      };

      let result = selectedPin.id ? await handleUpdatePin(selectedPin.id, pinData) : await handleCreatePin({...pinData, lat: selectedPin.lat, lng: selectedPin.lng});
      
      if(result) { 
          await fetchPins(); 
          setSelectedPin(result); 
          setIsEditMode(false); 
          alert("저장되었습니다."); 
      }
      setIsUploading(false); 
  };
  
  const handleContextMenuAction = async (action) => {
      const { latLng, pinId } = contextMenu;
      setContextMenu({ ...contextMenu, visible: false });
      if(action === 'createPin') {
          setLoading(true); const addr = await getAddressFromCoords(latLng.getLat(), latLng.getLng()); setLoading(false);
          setSelectedPin({ id: null, lat: latLng.getLat(), lng: latLng.getLng() }); setAddress(addr); setIsEditMode(true); setIsProposalOpen(false);
      } else if(action === 'editPin') {
          setIsEditMode(true); setIsProposalOpen(false);
      } else if(action === 'deletePin') {
          await handleDeletePin(pinId);
      } else if(action === 'addPinToStack') {
          handleOpenCreateInStack(latLng.getLat(), latLng.getLng());
      } else if(action === 'addToProposal') {
          const pinToAdd = pins.find(p => p.id === pinId);
          if (pinToAdd) {
              setProposalPins(prev => {
                  if (prev.find(p => p.id === pinId)) {
                      alert("이미 제안서 목록에 담긴 매물입니다.");
                      return prev;
                  }
                  return [pinToAdd, ...prev];
              });
              setIsProposalOpen(true);
              setSelectedPin(null);
          }
      }
  };
  
  const handleOpenCreateInStack = async (lat, lng) => {
      clearTempMarkerAndMenu(); setLoading(true); const addr = await getAddressFromCoords(lat, lng); setLoading(false);
      setSelectedPin({ id: null, lat, lng }); setAddress(addr); setIsAddingToStack(true); setIsEditMode(true); setIsProposalOpen(false);
  };
  
  const handleImageChange = (index, file) => {
      const newFiles = [...imageFiles];
      newFiles[index] = file;
      setImageFiles(newFiles);

      const newUrls = [...imageUrls];
      newUrls[index] = URL.createObjectURL(file); 
      setImageUrls(newUrls);
  };

  const handleImageRemove = (index) => {
      const newFiles = [...imageFiles];
      newFiles[index] = null;
      setImageFiles(newFiles);

      const newUrls = [...imageUrls];
      newUrls[index] = ''; 
      setImageUrls(newUrls);
  };

  // ---------------------------------------------------------------------------
  // ★ 3. [업그레이드] AI 입지 분석 기능 (병원 상세 분류 포함)
  // ---------------------------------------------------------------------------
  
  // 카테고리 검색 헬퍼 (거리순 정렬)
  const searchNearby = (categoryCode, lat, lng) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
        resolve([]);
        return;
      }
      const ps = new window.kakao.maps.services.Places();
      ps.categorySearch(categoryCode, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          // 거리순 정렬
          const sorted = data.sort((a, b) => a.distance - b.distance);
          resolve(sorted);
        } else {
          resolve([]);
        }
      }, {
        location: new window.kakao.maps.LatLng(lat, lng),
        radius: 2000, // 반경 2km 검색
        sort: window.kakao.maps.services.SortBy.DISTANCE
      });
    });
  };

  const handleGenerateIm = async (pin) => {
    if (!pin) return;
    setIsGenerating(true);

    try {
        // 카카오맵 API 병렬 조회
        const [subways, schools, marts, hospitals, convenience] = await Promise.all([
            searchNearby('SW8', pin.lat, pin.lng), // 지하철
            searchNearby('SC4', pin.lat, pin.lng), // 학교
            searchNearby('MT1', pin.lat, pin.lng), // 대형마트
            searchNearby('HP8', pin.lat, pin.lng), // 병원 (전체)
            searchNearby('CS2', pin.lat, pin.lng)  // 편의점
        ]);

        // --- 1. 교통 분석 (지하철 & 도로) ---
        let trafficText = "";
        if (subways.length > 0) {
            const nearest = subways[0];
            trafficText += `- 🚇 지하철: ${nearest.place_name} (직선거리 ${nearest.distance}m) 이용 가능\n`;
            if (subways.length > 1) trafficText += `- 그 외: ${subways[1].place_name} (${subways[1].distance}m) 인접\n`;
        } else {
            trafficText += "- 🚇 지하철: 도보권 내 지하철역 없음 (차량/버스 이동 권장)\n";
        }
        if (pin.address) {
             trafficText += `- 🛣️ 도로: ${pin.address} 인근, 주요 도로 접근성 양호`;
        }

        // --- 2. 학군 분석 (초/중/고 구분) ---
        const elemSchools = schools.filter(s => s.place_name.includes('초등'));
        const midSchools = schools.filter(s => s.place_name.includes('중학교'));
        const highSchools = schools.filter(s => s.place_name.includes('고등'));
        
        let eduText = "";
        if (elemSchools.length > 0) eduText += `- 🏫 초등학교: ${elemSchools[0].place_name} (${elemSchools[0].distance}m)\n`;
        if (midSchools.length > 0) eduText += `- 🏫 중학교: ${midSchools[0].place_name} (${midSchools[0].distance}m)\n`;
        if (highSchools.length > 0) eduText += `- 🏫 고등학교: ${highSchools[0].place_name} (${highSchools[0].distance}m)\n`;
        
        if (!eduText) eduText = "- 🏫 반경 2km 이내 학교 시설이 확인되지 않음 (학군 정보 확인 필요)\n";

        // --- 3. 인프라 분석 (마트 & 병원 상세) ---
        let infraText = "";
        
        // 마트
        if (marts.length > 0) {
            infraText += `- 🛒 마트/쇼핑: ${marts[0].place_name} (${marts[0].distance}m)\n`;
        } else if (convenience.length > 0) {
            infraText += `- 🏪 편의시설: 도보 거리에 ${convenience[0].place_name} 등 다수 분포\n`;
        }

        // 병원 (내과/외과/치과 분류)
        let hospitalText = "";
        if (hospitals.length > 0) {
             const internal = hospitals.find(h => h.place_name.includes('내과'));
             const surgery = hospitals.find(h => h.place_name.includes('외과') || h.place_name.includes('정형') || h.place_name.includes('마취'));
             const dental = hospitals.find(h => h.place_name.includes('치과'));
             const general = hospitals.find(h => h.category_name.includes('종합병원')); 

             const hospitalList = [];
             if (general) hospitalList.push(`종합병원: ${general.place_name}(${general.distance}m)`);
             if (internal) hospitalList.push(`내과: ${internal.place_name}(${internal.distance}m)`);
             if (surgery) hospitalList.push(`외과: ${surgery.place_name}(${surgery.distance}m)`);
             if (dental) hospitalList.push(`치과: ${dental.place_name}(${dental.distance}m)`);

             if (hospitalList.length > 0) {
                 hospitalText = `- 🏥 의료시설: ${hospitalList.join(', ')} 등 위치\n`;
             } else {
                 hospitalText = `- 🏥 의료시설: ${hospitals[0].place_name}(${hospitals[0].distance}m) 등 의원급 병원 인접\n`;
             }
        } else {
             hospitalText = "- 🏥 의료시설: 반경 2km 이내 병원 시설이 확인되지 않음\n";
        }
        infraText += hospitalText;

        // --- 4. 가격 및 요약 ---
        const priceInfo = pin.is_sale ? `매매 ${Number(pin.sale_price).toLocaleString()}만원` 
            : pin.is_jeonse ? `전세 ${Number(pin.jeonse_deposit).toLocaleString()}만원`
            : `월세 ${Number(pin.rent_deposit).toLocaleString()} / ${Number(pin.rent_amount).toLocaleString()}`;

        // 최종 보고서 텍스트 조립
        const finalReport = `
[🔎 AI 입지 정밀 분석 보고서]

1. 교통 및 위치 (Accessibility)
${trafficText}

2. 학군 정보 (Education)
${eduText.trim()}

3. 생활 편의 및 의료 (Infrastructure)
${infraText.trim()}

4. 가격 및 종합 의견
- 💰 가격: ${priceInfo}
- 📝 요약: ${subways.length > 0 ? '역세권 프리미엄을 갖춘' : '조용하고 쾌적한 주거 환경의'} 매물입니다. ${schools.length > 0 ? '특히 우수한 교육 환경을 갖추고 있어 자녀가 있는 세대에 적합하며,' : ''} ${marts.length > 0 ? '대형 마트가 인접해 있어 생활 편의성이 뛰어납니다.' : '기본적인 생활 인프라가 잘 갖춰져 있습니다.'}
${pin.keywords ? `\n(✨ 주요 특징: ${pin.keywords})` : ''}
        `.trim();

        setImContent(finalReport);

    } catch (error) {
        console.error("분석 중 오류:", error);
        setImContent("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAddToTour = (pin) => setTourPins(p => [...p, pin]); const handleRemoveFromTour = (id) => setTourPins(p => p.filter(x => x.id !== id)); const handleClearTour = () => setTourPins([]); const handleOptimizeTour = () => {};

  const value = {
    pins, loading, fetchPins,
    address, setAddress, detailedAddress, setDetailedAddress, buildingName, setBuildingName,
    propertyType, setPropertyType, propertyTypeEtc, setPropertyTypeEtc,
    isSale, setIsSale, salePrice, setSalePrice, isJeonse, setIsJeonse, jeonseDeposit, setJeonseDeposit, jeonsePremium, setJeonsePremium, isRent, setIsRent, rentDeposit, setRentDeposit, rentAmount, setRentAmount, keywords, setKeywords, notes, setNotes, status, setStatus,
    imageFiles, setImageFiles, imageUrls, setImageUrls, validationErrors, setValidationErrors,
    selectedPin, setSelectedPin, isEditMode, setIsEditMode, isUploading, isLeftPanelOpen, setIsLeftPanelOpen, listTitle, setListTitle, isListForced, setIsListForced, activeOverlayKey, setActiveOverlayKey, visiblePins, setVisiblePins, expandedStackKeys, setExpandedStackKeys, isAddingToStack,
    filterPropertyType, setFilterPropertyType, filterTransactionType, setFilterTransactionType, filterStatus, setFilterStatus, filteredPins,
    activeMapType, setActiveMapType, roadviewMode, setRoadviewMode, pinBeforeRoadview, setPinBeforeRoadview,
    customers, linkedCustomers, fetchCustomers, fetchLinkedCustomers, handleLinkCustomer, handleUnlinkCustomer,
    imContent, setImContent, isGenerating, handleGenerateIm, tourPins, routeLine, handleAddToTour, handleRemoveFromTour, handleClearTour, handleOptimizeTour,
    contextMenu, setContextMenu, contextMenuRef, viewingImage, setViewingImage, 
    
    proposalPins, setProposalPins, isProposalOpen, setIsProposalOpen,
    
    tempMarkerRef, 
    
    mapRef, mapInstanceRef, clustererRef, 
    
    drawMarkers, handleMapMove, clearTempMarkerAndMenu, handleSidebarSave, handleDeletePin, handleContextMenuAction, handleOpenCreateInStack, handlePinContextMenu, handleImageChange, handleImageRemove,
    toggleRoadview: (mode = 'MAP') => setRoadviewMode(prev => prev === mode ? 'OFF' : mode),
    isMapReady, setIsMapReady,
    session, mode
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}