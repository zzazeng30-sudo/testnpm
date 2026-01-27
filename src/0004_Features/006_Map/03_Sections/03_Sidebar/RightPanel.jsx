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
  
  // ★★★ [신규] 로그인 성공 여부를 기억하는 상태 ★★★
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    display: 'flex',           // Flexbox 적용
    flexDirection: 'column',   // 세로 정렬
    overflow: 'hidden'         // 패널 자체가 넘치는 것 방지
  };

  // [수정 2] 내부 스크롤 영역 스타일 분리
  const scrollContentStyle = {
    flex: 1,                   // 남은 공간 모두 차지
    overflowY: 'auto',         // 세로 스크롤 활성화
    paddingBottom: '100px'     // 하단 여백 유지
  };

  // --- [STEP 1] 매물 목록 조회 (/units) ---
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/v2/units", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      
      if (result.success) {
        setSeumterData(result);
        setIsModalOpen(true);
        setShowSeumterLogin(false); // 모달 닫기
        
        // ★★★ [성공 시] 로그인 상태를 true로 설정하여 다음부터 팝업 생략 ★★★
        setIsLoggedIn(true); 
      } else { 
        // 실패 시 (비번 틀림 등) 다시 로그인해야 하므로 false
        setIsLoggedIn(false);
        alert(result.message); 
      }
    } catch (e) { 
      setIsLoggedIn(false); // 에러 나면 다시 로그인 유도
      alert("조회 실패: " + e.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // --- [신규] 조회 버튼 클릭 핸들러 (스마트 조회) ---
  const handleInquiryClick = () => {
    if (isLoggedIn) {
      // 이미 로그인 성공한 적이 있으면 -> 모달 없이 바로 조회
      runSeumterInquiry();
    } else {
      // 로그인한 적 없으면 -> 로그인 모달 띄우기
      setShowSeumterLogin(true);
    }
  };

  // --- [STEP 2] 소유자 정보 조회 (/owner) ---
  const handleOwnerInquiry = async (selectedItem) => {
    if (!selectedItem) return;
    const mapping = seumterData?.pnuMapping; 
    if (!mapping) return alert("주소 정보가 유실되었습니다.");

    setIsLoading(true);
    try {
      console.log("🚀 [추가] 서버로 소유자 조회 요청 전송");
      const response = await fetch("/api/v2/owner", { 
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
        alert(`✅ 소유자 추출 성공! (추출된 인원: ${result.data?.length}명)`);
      } else { 
        alert("실패: " + result.message); 
      }
    } catch (e) { alert("서버 통신 오류"); } finally { setIsLoading(false); }
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
              
              {/* ★★★ [수정] onClick을 handleInquiryClick으로 변경 ★★★ */}
              <button onClick={handleInquiryClick} style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                {isLoading ? '조회 중...' : '📋 전유부조회'}
              </button>

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
