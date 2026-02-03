/**
 * [Revision: 2.6]
 * - 브라우저 기본 scrollIntoView 삭제 (전체 화면 밀림의 근본 원인 차단)
 * - 요소의 offsetTop을 계산하여 패널 내부 scrollTop을 직접 조작하는 방식으로 변경
 */
import React, { useState, useEffect, useRef } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import styles from './LeftPanel.module.css';

const LeftPanel = () => {
  const { 
    displayNodes, selectedPin, setSelectedPin, 
    mapInstanceRef, hoveredPinId, setHoveredPinId,
    isCreating, isEditMode, isStackMode, startStackRegistration, setIsEditMode
  } = useMap();
  
  const [expandedKeys, setExpandedKeys] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // 패널 컨텐츠 영역과 각 아이템을 가리키는 Ref 추가
  const panelContentRef = useRef(null);
  const scrollRefs = useRef({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ★ 화면 밀림 원천 차단: 직접 스크롤 계산 로직 ★
  useEffect(() => {
    if (selectedPin && selectedPin.id && displayNodes) {
      // 1. 부모 그룹 확장
      const newExpandedKeys = { ...expandedKeys };
      displayNodes.forEach(node => {
        if (node.items && node.items.some(item => String(item.id) === String(selectedPin.id))) {
          newExpandedKeys[node.id] = true;
        }
      });
      setExpandedKeys(newExpandedKeys);

      // 2. 0.1초 뒤 스크롤 이동 (DOM 렌더링 대기)
      setTimeout(() => {
        const targetElement = scrollRefs.current[selectedPin.id];
        const container = panelContentRef.current;

        if (targetElement && container) {
          // 브라우저의 scrollIntoView 대신 직접 scrollTop 조작
          // container 내에서의 상대적인 위치 계산
          const targetOffsetTop = targetElement.offsetTop;
          const containerHeight = container.clientHeight;
          
          // 중앙에 위치시키기 위한 목표치 계산
          const targetScrollTop = targetOffsetTop - (containerHeight / 2) + (targetElement.clientHeight / 2);

          // 부드럽게 이동 (전체 화면 레이아웃에 영향 없음)
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [selectedPin, displayNodes]);

  const toggleGroup = (key) => setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const handleItemClick = (pin) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(new window.kakao.maps.LatLng(pin.lat, pin.lng));
    }
    setSelectedPin(pin);
  };

  const formatSimplePrice = (pin) => {
    if (!pin) return '-';
    const fmt = n => Number(n || 0).toLocaleString();
    const parts = [];
    if (pin.is_sale) parts.push(`매 ${fmt(pin.sale_price)}`);
    if (pin.is_jeonse) parts.push(`전 ${fmt(pin.jeonse_deposit)}`);
    if (pin.is_rent) {
      const deposit = pin.rent_deposit ? fmt(pin.rent_deposit) : '0';
      const rent = fmt(pin.rent_amount);
      parts.push(`월 ${deposit}/${rent}`);
    }
    let priceStr = parts.join(' | ');
    if (pin.key_money > 0) {
      if (priceStr) priceStr += ' | ';
      priceStr += `권 ${fmt(pin.key_money)}`;
    }
    return priceStr || '-';
  };

  const renderItem = (pin, isChild = false) => {
    const isActive = selectedPin && String(selectedPin.id) === String(pin.id);
    const isHovered = String(hoveredPinId) === String(pin.id);

    return (
      <li 
        key={pin.id} 
        ref={el => scrollRefs.current[pin.id] = el}
        onClick={(e) => { e.stopPropagation(); handleItemClick(pin); }} 
        onMouseEnter={() => !isMobile && setHoveredPinId(pin.id)} 
        onMouseLeave={() => !isMobile && setHoveredPinId(null)}   
        className={`${styles.item} ${isChild ? styles.childItem : ''} ${isActive ? styles.active : ''} ${isHovered ? styles.hovered : ''}`}
      >
         <div className={styles.itemHeader} style={{ display: 'flex', flexDirection:'column', width: '100%', gap:'4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width:'100%' }}>
                <span className={styles.keywords} style={{ fontWeight: 'bold', fontSize:'0.95rem' }}>
                    {pin.title || pin.building_name || pin.keywords || '매물'}
                </span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2563eb', textAlign: 'right' }}>
                {formatSimplePrice(pin)}
            </div>
         </div>
         <div className={styles.addressLabel}>{pin.address}</div>
      </li>
    );
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelHeader}>
        <h2 className={styles.headerTitle}>
          {isStackMode ? (isEditMode ? '스택 제목 수정' : '스택 매물 추가') : (isCreating ? '새 매물 등록' : (isEditMode ? '매물 수정' : '매물 리스트'))}
        </h2>
      </div>
      
      {/* ★ Ref 연결: 스크롤이 발생하는 실제 영역 ★ */}
      <div className={`${styles.panelContent} scroll-box`} ref={panelContentRef}>
        <ul className={styles.listContainer}>
          {displayNodes.map((node) => {
            if (node.type === 'SINGLE') return renderItem(node.data, false);
            const isExpanded = expandedKeys[node.id];
            return (
              <li key={node.id} className={styles.groupItem}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupInfo} onClick={() => toggleGroup(node.id)}>
                    <div className={`${styles.countBadge} ${styles.stack}`}>{node.items.length}</div>
                    <div className={styles.groupTitle}>{node.title || '동일위치 매물'}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isExpanded && (
                      <button 
                        className={styles.stackEditBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditMode(true); 
                          startStackRegistration(node.items[0], node.title); 
                        }}
                      >
                        수정
                      </button>
                    )}
                    <div className={styles.arrowIcon} onClick={() => toggleGroup(node.id)}>
                      {isExpanded ? '▲' : '▼'}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <ul className={styles.childList}>
                    {node.items.map(subItem => renderItem(subItem, true))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default LeftPanel;