import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapOverlays.module.css';

const MapControls = () => {
  const { mapInstanceRef, isRoadviewMode, setIsRoadviewMode } = useMap();
  
  // 내부 로컬 상태
  const [mapType, setMapType] = useState('ROADMAP'); 
  const [showDistrict, setShowDistrict] = useState(false); 

  // 외부 상태 동기화 (로드뷰 닫기 버튼 등 대응)
  useEffect(() => {
    // 로드뷰 모드가 변경될 때 필요한 로직이 있다면 여기에 추가
  }, [isRoadviewMode]);

  // 1. 지도 vs 스카이뷰 토글
  const handleMapType = (e, type) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    const kakaoType = type === 'ROADMAP' 
      ? window.kakao.maps.MapTypeId.ROADMAP 
      : window.kakao.maps.MapTypeId.HYBRID;
    
    map.setMapTypeId(kakaoType);
    setMapType(type);
  };

  // 2. 지적편집도 vs 로드뷰 토글
  const handleOverlay = (e, mode) => {
    e.stopPropagation();
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) return;

    if (mode === 'district') {
      const nextState = !showDistrict;
      if (nextState) {
        map.addOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        setIsRoadviewMode(false);
      } else {
        map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
      }
      setShowDistrict(nextState);
    } 
    else if (mode === 'roadview') {
      const nextState = !isRoadviewMode;
      if (nextState) {
        map.removeOverlayMapTypeId(window.kakao.maps.MapTypeId.USE_DISTRICT);
        setShowDistrict(false);
      }
      setIsRoadviewMode(nextState);
    }
  };

  // [핵심 해결] 
  // 1. CSS의 .active 클래스를 정확히 가져오도록 수정 (데스크탑 활성화 문제 해결)
  const getBtnClass = (isActive) => {
    return `${styles.controlBtn} ${isActive ? styles.active : ''}`;
  };

  return (
    <div className={styles.controlsContainer} onClick={(e) => e.stopPropagation()}>
      {/* [핵심 해결] 
         2. 모바일 스타일을 위해 controlGroup div 부활 (모바일 깨짐 문제 해결)
         데스크탑에서는 CSS가 이 div를 투명하게 처리하므로 모양에 영향 없음
      */}
      
      {/* 그룹 1: 지도 / 스카이뷰 */}
      <div className={styles.controlGroup}>
        <button 
          className={getBtnClass(mapType === 'ROADMAP')}
          onClick={(e) => handleMapType(e, 'ROADMAP')}
        >
          <span>지도</span>
        </button>
        <button 
          className={getBtnClass(mapType === 'HYBRID')}
          onClick={(e) => handleMapType(e, 'HYBRID')}
        >
          <span>스카이</span>
        </button>
      </div>

      {/* 그룹 2: 지적편집도 / 로드뷰 */}
      <div className={styles.controlGroup}>
        <button 
          className={getBtnClass(showDistrict)}
          onClick={(e) => handleOverlay(e, 'district')}
        >
          <span>지적</span>
        </button>
        <button 
          className={getBtnClass(isRoadviewMode)}
          onClick={(e) => handleOverlay(e, 'roadview')}
        >
          <span>로드</span>
        </button>
      </div>
      
    </div>
  );
};

export default MapControls;