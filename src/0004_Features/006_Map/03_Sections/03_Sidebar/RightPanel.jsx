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
  
  // --- [상태] 세움터 관련 ---
  const [showSeumterLogin, setShowSeumterLogin] = useState(false);
  const [seumterId, setSeumterId] = useState('zzazeng10');
  const [seumterPw, setSeumterPw] = useState('Dlxogh12!');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seumterData, setSeumterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 로그인 성공 여부
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ★ 최종 결과 리스트
  const [ownerList, setOwnerList] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 핀이 바뀌면 결과 초기화
  useEffect(() => {
    setOwnerList(null);
    setIsLoading(false);
  }, [selectedPin]);

  const isMobile = windowWidth <= 768;
  if (isMobile) return null;

  const isVisible = !!selectedPin || isEditMode || isCreating || isStackMode;
  if (!isVisible) return null;

  const panelStyle = {
    position: 'absolute', 
    top: 0, 
    right: 0, 
    bottom: 0, 
    width: '420px',
    backgroundColor: 'white', 
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, 
    borderLeft: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    display: 'flex',           
    flexDirection: 'column',   
    overflow: 'hidden'         
  };

  // --- [STEP 1] 매물 목록 조회 (대시보드 열기) ---
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3002/units", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      
      if (result.success) {
        setSeumterData(result);
        setIsModalOpen(true); // 대시보드(모달) 열기
        setShowSeumterLogin(false);
        setIsLoggedIn(true); 
      } else { 
        setIsLoggedIn(false);
        alert(result.message); 
      }
    } catch (e) { 
      setIsLoggedIn(false); 
      alert("조회 실패 (서버 연결 확인 필요): " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleInquiryClick = () => {
    if (isLoggedIn) {
      runSeumterInquiry();
    } else {
      setShowSeumterLogin(true);
    }
  };

  // --- [STEP 2] 소유자 정보 조회 (핵심 수정 부분) ---
  const handleOwnerInquiry = async (selectedItem) => {
    if (!selectedItem) return;
    const mapping = seumterData?.pnuMapping; 
    
    // ★ [핵심] 클릭하자마자 모달을 먼저 닫습니다! (백그라운드 처리 느낌)
    setIsModalOpen(false); 
    
    // 패널을 로딩 상태로 변경
    setIsLoading(true);
    setOwnerList(null);

    try {
      const response = await fetch("http://localhost:3002/owner", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: seumterId, pw: seumterPw,
          item: selectedItem,
          mapping: mapping    
        })
      });
      const result = await response.json();
      
      if (result.success) {
        setOwnerList(result.data); // 결과 표시
      } else { 
        alert("실패: " + result.message); 
      }
    } catch (e) { 
        alert("서버 통신 오류: " + e.message); 
    } finally { 
        setIsLoading(false); // 로딩 끝
    }
  };

  const renderPriceInfo = (pin) => {
    const fmt = n => Number(n || 0).toLocaleString();
    const rows = [];
    if (pin.is_sale) rows.push({ label: '매매', text: fmt(pin.sale_price), c: '#ef4444', bg: '#fee2e2' });
    if (pin.is_jeonse) rows.push({ label: '전세', text: fmt(pin.jeonse_deposit), c: '#3b82f6', bg: '#dbeafe' });
    if (pin.is_rent) rows.push({ label: '월세', text: `${fmt(pin.rent_deposit)}/${fmt(pin.rent_amount)}`, c: '#10b981', bg: '#d1fae5' });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: r.bg, color: r.c, padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>{r.label}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{r.text}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={panelStyle}>
      <SeumterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={seumterData} 
        onConfirm={handleOwnerInquiry} 
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isStackMode ? <StackForm /> : (isCreating || isEditMode) ? (
          <div style={{ padding: '0' }}>
            <PinForm mode={isEditMode ? 'edit' : 'create'} />
          </div>
        ) : (
          selectedPin && (
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedPin.property_type}</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '8px 0' }}>{selectedPin.building_name || '매물 정보'}</h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedPin.address}</p>
              </div>
              <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '24px' }}>{renderPriceInfo(selectedPin)}</div>
              
              {/* --- [상태별 화면 분기] --- */}
              
              {/* 1. 로딩 중일 때 (모달 닫힌 직후) */}
              {isLoading && !isModalOpen ? (
                <div style={{ 
                  padding: '30px', textAlign: 'center', backgroundColor: '#f9fafb', 
                  borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '20px' 
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#374151' }}>소유자 정보 분석 중...</div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '5px' }}>약 5~10초 정도 소요됩니다.</div>
                </div>
              ) : (
                /* 2. 결과가 있을 때 (리스트 표시) */
                ownerList ? (
                  <div style={{ animation: 'fadeIn 0.3s ease-in-out', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>소유자 목록 ({ownerList.length})</h3>
                          <button 
                              onClick={() => setOwnerList(null)} 
                              style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                              결과 닫기
                          </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {ownerList.map((owner, idx) => (
                              <div key={idx} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#1f2937' }}>
                                          {owner.name} <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>({owner.share})</span>
                                      </div>
                                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontWeight: 'bold' }}>
                                          {owner.reason}
                                      </span>
                                  </div>
                                  <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '4px' }}>{owner.id}</div>
                                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{owner.address}</div>
                                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '6px', textAlign: 'right' }}>
                                      변동일: {owner.date}
                                  </div>
                              </div>
                          ))}
                          {ownerList.length === 0 && (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>소유자 정보가 없습니다.</div>
                          )}
                      </div>
                  </div>
                ) : (
                  /* 3. 기본 상태 (조회 버튼) */
                  <button onClick={handleInquiryClick} style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                      📋 전유부조회
                  </button>
                )
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600' }}>수정</button>
                <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontWeight: '600' }}>닫기</button>
              </div>
            </div>
          )
        )}
      </div>

      {showSeumterLogin && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', zIndex: 2000 }}>
          <h3 style={{ margin: '0 0 16px 0' }}>세움터 로그인</h3>
          <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="아이디" />
          <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #ddd' }} placeholder="비밀번호" />
          <button onClick={runSeumterInquiry} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{isLoading ? '조회 중...' : '로그인 및 조회'}</button>
          <button onClick={() => setShowSeumterLogin(false)} style={{ width: '100%', marginTop: '8px', padding: '10px', backgroundColor: 'transparent', color: '#666', border: 'none' }}>취소</button>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
