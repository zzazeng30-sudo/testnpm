import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import StackForm from './StackForm';
import SeumterModal from './SeumterModal';

const RightPanel = () => {
  const { 
    selectedPin, isEditMode, isCreating, resetSelection, setIsEditMode,
    isStackMode 
  } = useMap();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [viewMode, setViewMode] = useState('detail'); 
  const [showSeumterLogin, setShowSeumterLogin] = useState(false);
  const [seumterId, setSeumterId] = useState('');
  const [seumterPw, setSeumterPw] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seumterData, setSeumterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ownerResults, setOwnerResults] = useState([]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setViewMode('detail');
    setOwnerResults([]);
    setStatusMsg('');
  }, [selectedPin?.id]);

  const isMobile = windowWidth <= 768;
  if (isMobile) return null;
  if (!(selectedPin || isEditMode || isCreating || isStackMode)) return null;

  // --- [로직] 세움터 및 AI 분석 ---
  const runSeumterInquiry = async () => { /* 기존 동일 */ };
  const handleOwnerInquiry = async (selectedItem) => { /* 기존 동일 */ };
  
  const handleAIAnalysis = () => {
    alert("AI 입지 분석을 시작합니다. (상권, 유동인구, 향후 가치 분석 등)");
    // 여기에 AI 분석 API 연동 로직 추가
  };

  // --- [헬퍼] 렌더링 함수들 ---
  const renderDetailRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: '500', color: '#111827' }}>{value || '-'}</span>
    </div>
  );

  const renderPriceInfo = (pin) => {
    const fmt = n => Number(n || 0).toLocaleString();
    const rows = [];
    if (pin.is_sale) rows.push({ label: '매매', text: `${fmt(pin.sale_price)}만원`, c: '#ef4444', bg: '#fee2e2' });
    if (pin.is_jeonse) rows.push({ label: '전세', text: `${fmt(pin.jeonse_deposit)}만원`, c: '#3b82f6', bg: '#dbeafe' });
    if (pin.is_rent) rows.push({ label: '월세', text: `${fmt(pin.rent_deposit)} / ${fmt(pin.rent_amount)}`, c: '#10b981', bg: '#d1fae5' });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: r.bg, color: r.c, padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem' }}>{r.label}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{r.text}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px', backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 1500, display: 'flex', flexDirection: 'column' }}>
      
      <SeumterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={seumterData} onConfirm={handleOwnerInquiry} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isStackMode ? <StackForm /> : (isCreating || isEditMode) ? (
          <PinForm mode={isEditMode ? 'edit' : 'create'} />
        ) : selectedPin && (
          <div>
            {/* 1. 사진 영역 (Carousel 등 확장 가능) */}
            <div style={{ width: '100%', height: '240px', backgroundColor: '#f3f4f6', position: 'relative' }}>
              {selectedPin.image_url ? (
                <img src={selectedPin.image_url} alt="매물사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', flexDirection: 'column' }}>
                  <span style={{ fontSize: '2rem' }}>🖼️</span>
                  <span style={{ fontSize: '0.8rem', marginTop: '8px' }}>등록된 사진이 없습니다.</span>
                </div>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              {/* 상단 탭 */}
              {ownerResults.length > 0 && (
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                  <button onClick={() => setViewMode('detail')} style={{ flex:1, padding:'10px', border:'none', background:'none', borderBottom: viewMode==='detail'?'2px solid #3b82f6':'none', fontWeight: 'bold', cursor:'pointer' }}>물건상세</button>
                  <button onClick={() => setViewMode('ownerResult')} style={{ flex:1, padding:'10px', border:'none', background:'none', borderBottom: viewMode==='ownerResult'?'2px solid #3b82f6':'none', fontWeight: 'bold', cursor:'pointer' }}>소유자현황</button>
                </div>
              )}

              {viewMode === 'detail' ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{selectedPin.property_type}</span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '8px 0' }}>{selectedPin.building_name || '매물 상세'}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px' }}>{selectedPin.address}</p>
                    
                    <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px' }}>
                      {renderPriceInfo(selectedPin)}
                    </div>
                  </div>

                  {/* 물건 상세 항목들 */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: '#374151' }}>기본 정보</h3>
                    {renderDetailRow("전용 면적", selectedPin.area ? `${selectedPin.area}평` : "-")}
                    {renderDetailRow("해당 층 / 총 층", `${selectedPin.floor || '-'}층 / ${selectedPin.total_floors || '-'}층`)}
                    {renderDetailRow("관리비", selectedPin.maintenance_fee ? `${Number(selectedPin.maintenance_fee).toLocaleString()}원` : "없음")}
                    {renderDetailRow("메인 키워드", selectedPin.keywords)}
                  </div>

                  {/* 상세 메모 */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px', color: '#374151' }}>상세 설명</h3>
                    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', fontSize: '0.9rem', lineHeight: '1.6', color: '#4b5563', whiteSpace: 'pre-wrap' }}>
                      {selectedPin.notes || "등록된 상세 설명이 없습니다."}
                    </div>
                  </div>
                  
                  {/* 버튼 그룹 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={handleInquiryClick} disabled={isLoading} style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {isLoading ? '조회 중...' : '📋 전유부/소유자 실시간 조회'}
                    </button>
                    <button onClick={handleAIAnalysis} style={{ width: '100%', padding: '14px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                      ✨ AI 입지 및 수익성 분석
                    </button>
                  </div>
                </>
              ) : (
                /* 소유자 결과 화면 (기존과 동일하되 디자인 통일) */
                <div style={{ animation: 'fadeIn 0.3s' }}>
                   {/* ... (기존 소유자 리스트 렌더링 로직) ... */}
                   {ownerResults.map((owner, idx) => (
                      <div key={idx} style={{ padding:'15px', border:'1px solid #eee', borderRadius:'10px', marginBottom: '10px' }}>
                        <div style={{ fontWeight:'bold', color:'#1e293b' }}>👤 {owner.name} ({owner.share})</div>
                        <div style={{ fontSize:'0.85rem', color:'#64748b', marginTop:'5px' }}>📍 {owner.address}</div>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 하단 공통 액션 버튼 */}
      {selectedPin && !isEditMode && !isCreating && (
        <div style={{ display: 'flex', gap: '10px', padding: '20px', borderTop: '1px solid #eee', backgroundColor: 'white' }}>
          <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' }}>정보 수정</button>
          <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#f3f4f6', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
        </div>
      )}

      {/* 로그인 팝업 (기존 동일) */}
      {showSeumterLogin && (
        <div style={{ /* 기존 스타일 */ }}>
          {/* ... */}
        </div>
      )}
    </div>
  );
};

export default RightPanel;
