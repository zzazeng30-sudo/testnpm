/**
 * [Revision: 56.0]
 * - relayout() 및 resize 이벤트를 활용하여 검은 화면 방지
 * - roadviewPosition.panoId 감시를 통한 즉각 렌더링
 */
import React, { useEffect, useRef } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from '../../01_Pages/MapPanels.module.css';

const RoadviewPanel = () => {
  const { 
    roadviewPosition, 
    setRoadviewPosition, 
    setRoadviewHeading, 
    setIsRoadviewMode 
  } = useMap(); //
  
  const containerRef = useRef(null);
  const rvInstanceRef = useRef(null);

  useEffect(() => {
    if (!roadviewPosition || !containerRef.current || !window.kakao) return;

    if (!rvInstanceRef.current) {
      // 로드뷰 객체 최초 생성
      const rv = new window.kakao.maps.Roadview(containerRef.current);
      rvInstanceRef.current = rv;

      window.kakao.maps.event.addListener(rv, 'viewpoint_changed', () => {
        setRoadviewHeading(rv.getViewpoint().pan);
      });

      window.kakao.maps.event.addListener(rv, 'position_changed', () => {
        const pos = rv.getPosition();
        setRoadviewPosition(prev => ({
          ...prev,
          lat: pos.getLat(),
          lng: pos.getLng(),
          panoId: rv.getPanoId()
        }));
      });
    }

    const rv = rvInstanceRef.current;
    if (roadviewPosition.panoId) {
      rv.setPanoId(roadviewPosition.panoId, new window.kakao.maps.LatLng(roadviewPosition.lat, roadviewPosition.lng));
    }

    // ★ 레이아웃 강제 갱신 (이미지 안 나옴 해결 핵심)
    setTimeout(() => {
      rv.relayout();
    }, 200);

  }, [roadviewPosition?.panoId]);

  if (!roadviewPosition) return null;

  return (
    <div className={styles.roadviewWrapper} style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: '500px', 
      zIndex: 2000, backgroundColor: 'black', display: 'flex', flexDirection: 'column'
    }}>
      <div className={styles.roadviewHeader} style={{
        height: '45px', background: '#222', display: 'flex', 
        alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', color: 'white'
      }}>
        <span style={{ fontWeight: 'bold' }}>로드뷰 상세</span>
        <button 
          onClick={() => { setIsRoadviewMode(false); setRoadviewPosition(null); }}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}
        >
          ✕
        </button>
      </div>
      <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%' }} />
    </div>
  );
};

export default RoadviewPanel;