/**
 * [Revision Info]
 * Rev: 12.0 (Add Stack Registration)
 * - '스택 추가' 버튼 생성
 * - useMap에서 startStackRegistration 함수 연동
 */

import React from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { propertyService } from '../../../../services/propertyService';

const PinDetail = () => {
  const { 
    selectedPin, 
    setSelectedPin, 
    setIsEditMode,
    fetchPins,
    startStackRegistration // ★ Context에서 스택 등록 함수 가져오기
  } = useMap();

  if (!selectedPin) return null;

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await propertyService.deleteProperty(selectedPin.id);
      alert("삭제되었습니다.");
      setSelectedPin(null);
      if (fetchPins) fetchPins();
    }
  };

  const getPrice = () => {
    const fmt = (n) => Number(n || 0).toLocaleString();
    if (selectedPin.is_sale) return `매매 ${fmt(selectedPin.sale_price)}만원`;
    if (selectedPin.is_jeonse) return `전세 ${fmt(selectedPin.jeonse_deposit)}만원`;
    if (selectedPin.is_rent) return `월세 ${fmt(selectedPin.rent_deposit)} / ${fmt(selectedPin.rent_amount)}만원`;
    return '-';
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>매물 상세</h2>
        <button onClick={() => setSelectedPin(null)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' }}>&times;</button>
      </div>

      <div style={{ margin: '20px 0', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '4px', background: '#eff6ff', color: '#2563eb', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '8px' }}>
          {selectedPin.property_type || '매물'}
        </div>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#1e293b' }}>
          {selectedPin.title || selectedPin.building_name || selectedPin.address}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '15px' }}>
          {selectedPin.address} {selectedPin.detailed_address}
        </p>
        
        <div style={{ padding: '15px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: 0, color: '#059669' }}>
            {getPrice()}
          </p>
        </div>

        <p style={{ marginTop: '15px', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155', fontSize: '0.95rem' }}>
          {selectedPin.notes || '상세 메모가 없습니다.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* ★ [추가됨] 스택 추가 버튼 */}
        <button 
          onClick={() => startStackRegistration(selectedPin)}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#10b981', // 초록색 계열로 구분
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          + 이 건물에 매물(스택) 추가
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsEditMode(true)}
            style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            수정
          </button>
          <button 
            onClick={handleDelete}
            style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinDetail;