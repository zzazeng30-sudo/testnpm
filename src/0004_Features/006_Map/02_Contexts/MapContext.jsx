/**
 * [Revision: 58.0]
 * - 매물 클릭 시 지도가 갑자기 튀어서 레이아웃을 밀어버리는 현상 수정
 */
import React, { createContext, useContext, useState, useRef, useMemo, useCallback, useEffect } from 'react';
import usePinForm from '../04_Hooks/usePinForm';
import useMapFilters from '../04_Hooks/useMapFilters';
import useMapData from '../04_Hooks/useMapData';       
import useClustering from '../04_Hooks/useClustering'; 
import useMapMarkers from '../04_Hooks/useMapMarkers'; 

const MapContext = createContext(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("❌ MapContext Error");
  return context;
}

export function MapProvider({ children, session }) {
  const { pins, loading, fetchPins, handleDeletePin } = useMapData(session);
  const formState = usePinForm();
  const filterState = useMapFilters(pins);

  const [isMapReady, setIsMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(3);
  const [bounds, setBounds] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const displayNodes = useClustering(filterState.filteredPins, zoomLevel, bounds);

  const [selectedPin, setSelectedPin] = useState(null); 
  const [activeOverlayKey, setActiveOverlayKey] = useState(null);
  const [hoveredPinId, setHoveredPinId] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, latLng: null, isStack: false });
  
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false); 
  const [isEditMode, setIsEditMode] = useState(false); 
  const [isCreating, setIsCreating] = useState(false);
  const [rightClickPin, setRightClickPin] = useState(null);

  const [isStackMode, setIsStackMode] = useState(false);
  const [stackParentPin, setStackParentPin] = useState(null);

  const [isRoadviewMode, setIsRoadviewMode] = useState(false);
  const [roadviewPosition, setRoadviewPosition] = useState(null);
  const [roadviewHeading, setRoadviewHeading] = useState(0);

  useEffect(() => {
    if (session?.user?.id) fetchPins();
  }, [session?.user?.id, fetchPins]); 

  const updateMapState = useCallback(() => {
    if (mapInstanceRef.current) {
      setZoomLevel(mapInstanceRef.current.getLevel());
      setBounds(mapInstanceRef.current.getBounds());
    }
  }, []);

  // ★ 수정된 로직: 매물 클릭 시 지도가 밀리는 현상 방지 ★
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    // 타겟 좌표 설정
    const target = selectedPin || rightClickPin || (isStackMode ? stackParentPin : null);
    if (!target || !target.lat || !target.lng) return;

    const latLng = new window.kakao.maps.LatLng(target.lat, target.lng);
    
    // 현재 지도의 영역(Bounds)을 가져와서 매물이 이미 화면 안에 있는지 체크
    const mapBounds = map.getBounds();
    const isVisible = mapBounds.contain(latLng);

    // ★ 이미 화면 안에 매물이 보이고 있다면 지도를 움직이지 않음 (밀림 방지 핵심)
    if (isVisible && !isCreating && !isStackMode) {
      return; 
    }

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      let latOffset = (isCreating || isStackMode) ? 0.0045 : 0.002;
      map.panTo(new window.kakao.maps.LatLng(target.lat - latOffset, target.lng));
    } else {
      // 화면 밖에 있을 때만 부드럽게 이동
      map.panTo(latLng);
    }
  }, [selectedPin, isCreating, rightClickPin, isStackMode, stackParentPin]);

  const startStackRegistration = useCallback((parentPin, isEdit = false) => {
    setStackParentPin(parentPin);
    setIsStackMode(true);
    setIsEditMode(isEdit);
    setSelectedPin(null);
    setIsCreating(false);
    setIsRightPanelOpen(true);
  }, []);

  const closeStackMode = useCallback(() => {
    setIsStackMode(false);
    setStackParentPin(null);
    setIsEditMode(false);
    setIsRightPanelOpen(false);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedPin(null);
    setActiveOverlayKey(null);
    setHoveredPinId(null);
    setIsCreating(false);
    setIsEditMode(false);
    setIsRightPanelOpen(false);
    setContextMenu(prev => ({ ...prev, visible: false }));
    setRightClickPin(null);
    setIsStackMode(false);
    setStackParentPin(null);
  }, []);

  const handlePinContextMenu = useCallback((e, pin, isStack, nodeId) => {
    if(e.preventDefault) e.preventDefault();
    setSelectedPin(pin);
    setActiveOverlayKey(nodeId);
    if (mapInstanceRef.current) {
      const container = mapInstanceRef.current.getNode();
      const rect = container.getBoundingClientRect();
      setContextMenu({ visible: true, x: rect.width / 2 + 60, y: rect.height / 2 - 40, pinId: pin.id, isStack });
    }
  }, []);

  const onMapRightClick = useCallback(({ latLng }) => {
    if (mapInstanceRef.current) mapInstanceRef.current.panTo(latLng);
    setRightClickPin({ lat: latLng.getLat(), lng: latLng.getLng() });
    const container = mapInstanceRef.current.getNode();
    const rect = container.getBoundingClientRect();
    setContextMenu({ visible: true, latLng, x: rect.width / 2 + 60, y: rect.height / 2 - 40, pinId: null, isStack: false });
  }, []);

  const handleContextMenuAction = useCallback((action) => {
    const wasStack = contextMenu.isStack;
    setContextMenu(prev => ({ ...prev, visible: false }));
    if (action === 'createPin') {
        setIsCreating(true);
        setSelectedPin({ lat: contextMenu.latLng.getLat(), lng: contextMenu.latLng.getLng() });
    } else if (action === 'addStack') {
        if (selectedPin) startStackRegistration(selectedPin, false);
    } else if (action === 'editPin') {
        if (wasStack) {
            startStackRegistration(selectedPin, true);
        } else {
            setIsEditMode(true);
        }
    } else if (action === 'deletePin') {
        if(selectedPin?.id) handleDeletePin(selectedPin.id);
        setSelectedPin(null);
    } else if (action === 'roadview') {
        setIsRoadviewMode(true);
    }
  }, [contextMenu, selectedPin, handleDeletePin, startStackRegistration]);

  const mapVisuals = useMapMarkers({
    mapInstanceRef, isMapReady, displayNodes,
    setSelectedPin, setActiveOverlayKey, handlePinContextMenu,
    selectedPin, hoveredPinId, setHoveredPinId, activeOverlayKey
  });

  const value = useMemo(() => ({
    pins, loading, fetchPins, handleDeletePin, ...filterState, ...formState, session,
    isMapReady, setIsMapReady, zoomLevel, bounds, displayNodes,
    mapRef, mapInstanceRef, updateMapState,
    selectedPin, setSelectedPin, hoveredPinId, setHoveredPinId,
    activeOverlayKey, setActiveOverlayKey, contextMenu, handleContextMenuAction,
    isLeftPanelOpen, setIsLeftPanelOpen, isRightPanelOpen, setIsRightPanelOpen,
    isEditMode, setIsEditMode, isCreating, setIsCreating,
    isRoadviewMode, setIsRoadviewMode, roadviewPosition, setRoadviewPosition,
    roadviewHeading, setRoadviewHeading,
    handlePinContextMenu, onMapRightClick, resetSelection, rightClickPin,
    isStackMode, stackParentPin, startStackRegistration, closeStackMode,
    ...mapVisuals
  }), [
    pins, loading, fetchPins, handleDeletePin, filterState, formState, session, isMapReady, zoomLevel, bounds, displayNodes,
    selectedPin, hoveredPinId, activeOverlayKey, contextMenu, isLeftPanelOpen, isRightPanelOpen, isEditMode, isCreating,
    isRoadviewMode, roadviewPosition, roadviewHeading,
    updateMapState, handleContextMenuAction, handlePinContextMenu, onMapRightClick,
    resetSelection, rightClickPin, mapVisuals,
    isStackMode, stackParentPin, startStackRegistration, closeStackMode
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}