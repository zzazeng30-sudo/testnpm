import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import StackForm from './StackForm';
import SeumterModal from './SeumterModal';

const RightPanel = () => {
  // =================================================================
  // [Section 1] 상태 관리 및 훅 초기화
  // =================================================================
  const { 
    selectedPin, isEditMode, isCreating, resetSelection, setIsEditMode,
    isStackMode 
  } = useMap();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // --- 세움터 API 및 모달 관련 상태 ---
  const [showSeumterLogin, setShowSeumterLogin] = useState(false); // 로그인 모달 표시 여부
  const [seumterId, setSeumterId] = useState('zzazeng10');
  const [seumterPw, setSeumterPw] = useState('Dlxogh12!');
  const [isModalOpen, setIsModalOpen] = useState(false); // 건물 선택 모달 표시 여부
  const [seumterData, setSeumterData] = useState(null); // 건물 목록 데이터
  
  // --- [핵심] 화면 전환 및 로그인 유지 상태 ---
  // panelView: 'details' (기본상세), 'loading' (분석중), 'result' (소유자결과)
  const [panelView, setPanelView] = useState('details'); 
  const [ownerList, setOwnerList] = useState([]); // 소유자 결과 데이터
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 로그인 성공 여부 기억

  // 윈도우 리사이즈 핸들러
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 핀 선택이 바뀌면 화면을 항상 '기본 상세(details)'로 초기화
  useEffect(() => {
    if (selectedPin) {
        setPanelView('details');
        setOwnerList([]);
    }
  }, [selectedPin]);

  const isMobile = windowWidth <= 768;
  if (isMobile) return null;

  const isVisible = !!selectedPin || isEditMode || isCreating || isStackMode;
  if (!isVisible) return null;

  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  };

  // =================================================================
  // [Section 2] API 통신 로직 (로그인, 조회)
  // =================================================================

  /**
   * [API Step 1] 세움터 로그인 및 건물 목록(units) 조회
   * - 로그인 성공 시 isLoggedIn을 true로 설정하여 이후 로그인 팝업 생략
   */
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    
    // 로딩 상태는 여기서 켜지 않음 (모달이 뜰 때까지 대기)
    try {
      const response = await fetch("/api/v2/units", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      
      if (result.success) {
        setSeumterData(result);     // 데이터 저장
        setIsModalOpen(true);       // 건물 선택 모달 열기
        setShowSeumterLogin(false); // 로그인 모달 닫기
        setIsLoggedIn(true);        // ★ 로그인 성공 기억
      } else { 
        setIsLoggedIn(false);       // 실패 시 다시 로그인하도록 초기화
        alert(result.message); 
      }
    } catch (e) { 
      setIsLoggedIn(false);
      alert("조회 실패: " + e.message); 
    }
  };

  /**
   * [UI Action] '전유부조회' 버튼 클릭 핸들러
   * - 이미 로그인했다면 바로 조회, 아니면 로그인 모달 띄움
   */
  const handleInquiryClick = () => {
    if (isLoggedIn) {
      runSeumterInquiry();
    } else {
      setShowSeumterLogin(true);
    }
  };

  /**
   * [API Step 2] 선택한 건물의 소유자(owner) 정보 조회
   * - SeumterModal에서 '확인'을 누르면 실행됨
   */
  const handleOwnerInquiry = async (selectedItem) => {
    if (!selectedItem) return;
    const mapping = seumterData?.pnuMapping; 
    
    setIsModalOpen(false); // 모달 닫기
    setPanelView('loading'); // ★ 화면을 '로딩 중'으로 전환

    try {
      console.log("🚀 [요청] 소유자 정보 조회 시작");
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
        setOwnerList(result.data); // 결과 데이터 저장
        setPanelView('result');    // ★ 화면을 '결과 리스트'로 전환
      } else { 
        alert("실패: " + result.message); 
        setPanelView('details');   // 실패 시 다시 상세화면으로 복귀
      }
    } catch (e) { 
        alert("서버 통신 오류"); 
        setPanelView('details');
    }
  };

  // =================================================================
  // [Section 3] UI 렌더링 헬퍼 컴포넌트 (가격, 로딩, 결과창)
  // =================================================================

  // 3-1. 가격 정보 표시
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

  // 3-2. 로딩 화면 (애니메이션)
  const renderLoadingView = () => (
    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
        <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>데이터 분석 중...</h3>
        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.9rem' }}>세움터에서 건축물 대장을<br/>실시간으로 분석하고 있습니다.</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // 3-3. 결과 리스트 화면 (소유자 목록)
  const renderResultView = () => (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>📊 소유자 현황</h2>
            <button 
                onClick={() => setPanelView('details')} 
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontWeight: '600', color: '#4b5563' }}
            >
                닫기
            </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
            {ownerList.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                    소유자 정보가 없습니다.
                </div>
            ) : (
                ownerList.map((owner, idx) => (
                    <div key={idx} style={{ 
                        border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', marginBottom: '12px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', backgroundColor: '#fff'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>{owner.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '4px' }}>{owner.share}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem', color: '#4b5563' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ width: '60px', color: '#9ca3af', fontSize: '0.8rem' }}>주민번호</span>
                                <span>{owner.id}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <span style={{ width: '60px', color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>주소</span>
                                <span style={{ flex: 1 }}>{owner.address}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e5e7eb' }}>
                                <span style={{ color: '#2563eb', fontWeight: '600' }}>{owner.reason}</span>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{owner.date}</span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    </div>
  );

  // 3-4. 기본 상세 화면 (매물 정보)
  const renderDetailsView = () => (
    <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                {selectedPin.property_type}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '8px 0' }}>{selectedPin.building_name || '매물 정보'}</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedPin.address}</p>
        </div>
        
        <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '24px' }}>
            {renderPriceInfo(selectedPin)}
        </div>
        
        <button 
            onClick={handleInquiryClick} 
            style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}
        >
            📋 전유부조회 (소유자 확인)
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' }}>수정</button>
            <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
        </div>
    </div>
  );

  // =================================================================
  // [Section 4] 메인 렌더링
  // =================================================================
  return (
    <div style={panelStyle}>
      {/* 건물 선택 모달 (보이지 않다가 필요할 때 뜸) */}
      <SeumterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={seumterData} 
        onConfirm={handleOwnerInquiry} 
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isStackMode ? (
            <StackForm /> 
        ) : (isCreating || isEditMode) ? (
          <div style={{ padding: '0' }}>
            <PinForm mode={isEditMode ? 'edit' : 'create'} />
          </div>
        ) : (
          selectedPin && (
            <>
                {/* ★ 화면 상태(panelView)에 따라 컴포넌트 교체 ★ */}
                {panelView === 'loading' && renderLoadingView()}
                {panelView === 'result' && renderResultView()}
                {panelView === 'details' && renderDetailsView()}
            </>
          )
        )}
      </div>

      {/* 로그인 모달 (최초 1회 또는 로그인 필요 시에만 표시) */}
      {showSeumterLogin && (
        <div style={{ position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '300px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>세움터 로그인</h3>
                <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} placeholder="아이디" />
                <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }} placeholder="비밀번호" />
                <button onClick={runSeumterInquiry} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>로그인 및 조회</button>
                <button onClick={() => setShowSeumterLogin(false)} style={{ width: '100%', marginTop: '8px', padding: '10px', backgroundColor: 'transparent', color: '#666', border: 'none', cursor: 'pointer' }}>취소</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
