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
  
  // --- [상태] 세움터 및 UI 제어 ---
  const [viewMode, setViewMode] = useState('detail'); // 'detail' or 'ownerResult'
  const [showSeumterLogin, setShowSeumterLogin] = useState(false);
  const [seumterId, setSeumterId] = useState('');
  const [seumterPw, setSeumterPw] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seumterData, setSeumterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(''); // 현재 진행 단계 메시지
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ownerResults, setOwnerResults] = useState([]); // 서버에서 받은 소유자 목록

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 핀이 바뀌면 결과창 초기화
  useEffect(() => {
    setViewMode('detail');
    setOwnerResults([]);
    setStatusMsg('');
  }, [selectedPin?.id]);

  const isMobile = windowWidth <= 768;
  if (isMobile) return null;

  const isVisible = !!selectedPin || isEditMode || isCreating || isStackMode;
  if (!isVisible) return null;

  // --- [STEP 1] 매물 목록 조회 (/units) ---
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    setIsLoading(true);
    setStatusMsg('건축물 대장 목록을 가져오는 중...');
    try {
      const response = await fetch("/api/v2/units", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      
      if (result.success) {
        setSeumterData(result);
        setIsModalOpen(true); // 대시보드 모달 열기
        setShowSeumterLogin(false);
        setIsLoggedIn(true); 
        setStatusMsg('목록 조회 완료');
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
    if (isLoggedIn) runSeumterInquiry();
    else setShowSeumterLogin(true);
  };

  // --- [STEP 2] 소유자 정보 조회 (/owner) ---
  const handleOwnerInquiry = async (selectedItem) => {
    if (!selectedItem) return;
    const mapping = seumterData?.pnuMapping; 
    if (!mapping) return alert("주소 정보가 유실되었습니다.");

    setIsModalOpen(false); // ★ 중요: 조회 시작 시 대시보드 모달 닫기
    setViewMode('ownerResult'); // 라이트 패널을 결과 모드로 변경
    setIsLoading(true);
    setStatusMsg('세움터 세션 연결 및 장바구니 담기 중...');

    try {
      // 진행 상태 시뮬레이션 (서버 응답 시간에 맞춰 메시지 변경 가능)
      const msgInterval = setInterval(() => {
        if(statusMsg.includes('장바구니')) setStatusMsg('문서 발급 신청 및 처리 대기 중 (최대 20초)...');
        else if(statusMsg.includes('발급')) setStatusMsg('데이터 다운로드 및 분석 중...');
      }, 5000);

      const response = await fetch("/api/v2/owner", { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: seumterId, pw: seumterPw,
          item: selectedItem,
          mapping: mapping    
        })
      });
      
      clearInterval(msgInterval);
      const result = await response.json();
      
      if (result.success) {
        setOwnerResults(result.data);
        setStatusMsg('조회 완료');
      } else { 
        setStatusMsg('조회 실패');
        alert("실패: " + result.message); 
      }
    } catch (e) { 
      setStatusMsg('통신 오류 발생');
      alert("서버 통신 오류"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 스타일 정의
  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
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
      {/* 매물 목록 모달 (대시보드) */}
      <SeumterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={seumterData} 
        onConfirm={handleOwnerInquiry} 
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {isStackMode ? <StackForm /> : (isCreating || isEditMode) ? (
          <PinForm mode={isEditMode ? 'edit' : 'create'} />
        ) : (
          selectedPin && (
            <div style={{ padding: '24px' }}>
              {/* 상단 탭 (결과가 있을 때만 노출) */}
              {ownerResults.length > 0 && (
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                  <button onClick={() => setViewMode('detail')} style={{ flex:1, padding:'10px', border:'none', background:'none', borderBottom: viewMode==='detail'?'2px solid #3b82f6':'none', fontWeight: viewMode==='detail'?'bold':'normal', cursor:'pointer' }}>기본정보</button>
                  <button onClick={() => setViewMode('ownerResult')} style={{ flex:1, padding:'10px', border:'none', background:'none', borderBottom: viewMode==='ownerResult'?'2px solid #3b82f6':'none', fontWeight: viewMode==='ownerResult'?'bold':'normal', cursor:'pointer' }}>소유자현황</button>
                </div>
              )}

              {viewMode === 'detail' ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedPin.property_type}</span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '8px 0' }}>{selectedPin.building_name || '매물 정보'}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedPin.address}</p>
                  </div>
                  <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '24px' }}>{renderPriceInfo(selectedPin)}</div>
                  
                  <button onClick={handleInquiryClick} disabled={isLoading} style={{ width: '100%', padding: '14px', backgroundColor: isLoading ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                    {isLoading ? '조회 중...' : '📋 전유부/소유자 조회'}
                  </button>
                </>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
                    <h3 style={{ margin:0 }}>소유자 분석 결과</h3>
                    <button onClick={() => setViewMode('detail')} style={{ fontSize:'0.8rem', color:'#666', border:'none', background:'none', cursor:'pointer' }}>돌아가기</button>
                  </div>

                  {/* 로딩/진행 상태창 */}
                  {isLoading && (
                    <div style={{ padding:'15px', backgroundColor:'#f8fafc', borderRadius:'8px', border:'1px solid #e2e8f0', marginBottom:'15px' }}>
                      <div style={{ fontSize:'0.9rem', color:'#3b82f6', fontWeight:'bold', marginBottom:'5px' }}>🔄 {statusMsg}</div>
                      <div style={{ width:'100%', height:'4px', backgroundColor:'#e2e8f0', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ width:'60%', height:'100%', backgroundColor:'#3b82f6', transition:'width 1s' }}></div>
                      </div>
                    </div>
                  )}

                  {/* 결과 테이블 */}
                  {!isLoading && ownerResults.length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {ownerResults.map((owner, idx) => (
                        <div key={idx} style={{ padding:'15px', border:'1px solid #eee', borderRadius:'10px', fontSize:'0.9rem', position:'relative' }}>
                          <div style={{ fontWeight:'bold', fontSize:'1rem', marginBottom:'8px', color:'#1e293b' }}>
                             👤 {owner.name} <span style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:'normal' }}>({owner.share})</span>
                          </div>
                          <div style={{ color:'#475569', lineHeight:'1.6' }}>
                            <div>🆔 {owner.id}</div>
                            <div>📅 {owner.date} ({owner.reason})</div>
                            <div style={{ fontSize:'0.85rem', color:'#94a3b8', marginTop:'5px' }}>📍 {owner.address}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !isLoading && (
                    <div style={{ textAlign:'center', padding:'40px 0', color:'#94a3b8' }}>분석된 소유자 정보가 없습니다.</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600' }}>수정</button>
                <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontWeight: '600' }}>닫기</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* 로그인 팝업 */}
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
