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
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ★★★ [신규] 최종 조회 결과를 저장할 상태 ★★★
  const [ownerList, setOwnerList] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 핀이 변경되면 기존 조회 결과 초기화
  useEffect(() => {
    setOwnerList(null);
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

  // --- [STEP 1] 매물 목록 조회 ---
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    setIsLoading(true);
    try {
      // ※ 주의: 실제 서버 포트(3002)에 맞게 주소를 수정하거나 프록시 설정을 확인하세요.
      // 일단 기존 코드 포맷을 유지했습니다.
      const response = await fetch("http://localhost:3002/units", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      
      if (result.success) {
        setSeumterData(result);
        setIsModalOpen(true);
        setShowSeumterLogin(false);
        setIsLoggedIn(true); 
      } else { 
        setIsLoggedIn(false);
        alert(result.message); 
      }
    } catch (e) { 
      setIsLoggedIn(false);
      alert("조회 실패: " + e.message); 
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

  // --- [STEP 2] 소유자 정보 조회 (모달에서 호출됨) ---
  const handleOwnerInquiry = async (selectedItem) => {
    if (!selectedItem) return;
    const mapping = seumterData?.pnuMapping; 
    if (!mapping) return alert("주소 정보가 유실되었습니다.");

    setIsLoading(true);
    try {
      console.log("🚀 [추가] 서버로 소유자 조회 요청 전송");
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
        // ★★★ [수정] 모달은 닫고, 결과는 패널에 저장 ★★★
        setIsModalOpen(false); 
        setOwnerList(result.data); // 결과 상태 저장
        // alert 제거 (화면에 바로 보여줄 것이므로)
      } else { 
        alert("실패: " + result.message); 
      }
    } catch (e) { 
        alert("서버 통신 오류"); 
    } finally { 
        setIsLoading(false); 
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
              
              {/* ★★★ [결과 화면] 조회 결과가 있으면 리스트 표시, 없으면 조회 버튼 표시 ★★★ */}
              {ownerList ? (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>소유자 목록 ({ownerList.length})</h3>
                        <button 
                            onClick={() => setOwnerList(null)} 
                            style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            다시 조회
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
                    </div>
                </div>
              ) : (
                <button onClick={handleInquiryClick} style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                    {isLoading ? '조회 중...' : '📋 전유부조회'}
                </button>
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
