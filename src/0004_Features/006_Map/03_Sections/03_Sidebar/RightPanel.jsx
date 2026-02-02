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
  const [statusMsg, setStatusMsg] = useState(''); 
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ownerResults, setOwnerResults] = useState([]); 

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
        setIsModalOpen(true); 
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

    setIsModalOpen(false); 
    setViewMode('ownerResult'); 
    setIsLoading(true);
    setStatusMsg('세움터 세션 연결 및 장바구니 담기 중...');

    try {
      const msgInterval = setInterval(() => {
        setStatusMsg(prev => {
          if(prev.includes('장바구니')) return '문서 발급 신청 및 처리 대기 중 (최대 20초)...';
          if(prev.includes('발급')) return '데이터 다운로드 및 분석 중...';
          return prev;
        });
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

  const handleAIAnalysis = () => {
    alert("✨ AI 입지 분석 엔진을 가동합니다. 잠시만 기다려주세요.");
    // 추후 AI 분석 API 호출 로직 삽입
  };

  // --- 스타일 및 렌더링 헬퍼 ---
  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  };

  const renderDetailRow = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>{label}</span>
      <span style={{ color: '#111827', fontSize: '0.95rem', fontWeight: '600' }}>{value || '-'}</span>
    </div>
  );

  const renderPriceInfo = (pin) => {
    const fmt = n => Number(n || 0).toLocaleString();
    const rows = [];
    if (pin.is_sale) rows.push({ label: '매매', text: `${fmt(pin.sale_price)}만원`, c: '#ef4444', bg: '#fee2e2' });
    if (pin.is_jeonse) rows.push({ label: '전세', text: `${fmt(pin.jeonse_deposit)}만원`, c: '#3b82f6', bg: '#dbeafe' });
    if (pin.is_rent) {
        const rentText = `보증금 ${fmt(pin.rent_deposit)} / 월 ${fmt(pin.rent_amount)}`;
        rows.push({ label: '월세', text: rentText, c: '#10b981', bg: '#d1fae5' });
    }
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
          <PinForm mode={isEditMode ? 'edit' : 'create'} />
        ) : (
          selectedPin && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              
              {/* 1. 사진 영역 */}
              <div style={{ width: '100%', height: '260px', backgroundColor: '#f3f4f6', overflow: 'hidden', position: 'relative' }}>
                {selectedPin.image_url ? (
                    <img src={selectedPin.image_url} alt="매물 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '3rem' }}>🏢</span>
                        <span style={{ fontSize: '0.9rem' }}>등록된 매물 사진이 없습니다.</span>
                    </div>
                )}
              </div>

              <div style={{ padding: '24px' }}>
                {/* 2. 상단 탭 (소유자 결과가 있을 때만 활성화) */}
                {ownerResults.length > 0 && (
                  <div style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', marginBottom: '24px' }}>
                    <button onClick={() => setViewMode('detail')} style={{ flex:1, padding:'12px', border:'none', background:'none', borderBottom: viewMode==='detail'?'3px solid #3b82f6':'none', fontWeight: 'bold', color: viewMode==='detail'?'#3b82f6':'#94a3b8', cursor:'pointer', transition: '0.2s' }}>물건정보</button>
                    <button onClick={() => setViewMode('ownerResult')} style={{ flex:1, padding:'12px', border:'none', background:'none', borderBottom: viewMode==='ownerResult'?'3px solid #3b82f6':'none', fontWeight: 'bold', color: viewMode==='ownerResult'?'#3b82f6':'#94a3b8', cursor:'pointer', transition: '0.2s' }}>소유자현황</button>
                  </div>
                )}

                {viewMode === 'detail' ? (
                  <>
                    {/* 3. 기본 정보 헤더 */}
                    <div style={{ marginBottom: '20px' }}>
                      <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{selectedPin.property_type || '부동산'}</span>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '10px 0 5px', color: '#111827' }}>{selectedPin.building_name || '매물 정보'}</h2>
                      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>{selectedPin.address} {selectedPin.detailed_address || ''}</p>
                    </div>

                    {/* 4. 가격 섹션 */}
                    <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '24px', border: '1px solid #dcfce7' }}>
                        {renderPriceInfo(selectedPin)}
                    </div>

                    {/* 5. 물건 상세 항목 리스트 */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', paddingBottom: '8px', borderBottom: '2px solid #f3f4f6' }}>상세 제원</h3>
                        {renderDetailRow("메인 키워드", selectedPin.keywords)}
                        {renderDetailRow("전용 면적", selectedPin.area ? `${selectedPin.area}평` : "-")}
                        {renderDetailRow("층수 정보", `${selectedPin.floor || '-'}층 / ${selectedPin.total_floors || '-'}층`)}
                        {renderDetailRow("관리비", selectedPin.maintenance_fee ? `${Number(selectedPin.maintenance_fee).toLocaleString()}원` : "정보 없음")}
                        {renderDetailRow("등록일자", selectedPin.created_at ? new Date(selectedPin.created_at).toLocaleDateString() : "-")}
                    </div>

                    {/* 6. 상세 설명 (메모) */}
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '12px' }}>상세 설명</h3>
                        <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '10px', fontSize: '0.95rem', lineHeight: '1.7', color: '#374151', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap', minHeight: '80px' }}>
                            {selectedPin.notes || "등록된 메모가 없습니다."}
                        </div>
                    </div>
                    
                    {/* 7. 분석 버튼 그룹 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                        <button onClick={handleInquiryClick} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: isLoading ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)' }}>
                        {isLoading ? '데이터 연동 중...' : '📋 전유부/소유자 실시간 조회'}
                        </button>
                        <button onClick={handleAIAnalysis} style={{ width: '100%', padding: '16px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)' }}>
                        ✨ AI 입지 및 가치 분석
                        </button>
                    </div>
                  </>
                ) : (
                  /* 소유자 결과 모드 */
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                      <h3 style={{ margin:0, fontSize: '1.2rem' }}>소유자 분석 리스트</h3>
                      <button onClick={() => setViewMode('detail')} style={{ fontSize:'0.85rem', color:'#3b82f6', border:'none', background:'none', cursor:'pointer', fontWeight: 'bold' }}>정보 돌아가기</button>
                    </div>

                    {isLoading && (
                      <div style={{ padding:'20px', backgroundColor:'#eff6ff', borderRadius:'12px', border:'1px solid #dbeafe', marginBottom:'20px' }}>
                        <div style={{ fontSize:'0.95rem', color:'#1e40af', fontWeight:'bold', marginBottom:'8px' }}>🔄 {statusMsg}</div>
                        <div style={{ width:'100%', height:'6px', backgroundColor:'#dbeafe', borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ width:'70%', height:'100%', backgroundColor:'#3b82f6', transition:'width 0.5s' }}></div>
                        </div>
                      </div>
                    )}

                    {!isLoading && ownerResults.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                        {ownerResults.map((owner, idx) => (
                          <div key={idx} style={{ padding:'18px', border:'1px solid #f1f5f9', borderRadius:'12px', fontSize:'0.95rem', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontWeight:'800', fontSize:'1.1rem', marginBottom:'10px', color:'#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>👤 {owner.name}</span>
                                <span style={{ fontSize:'0.9rem', color:'#3b82f6' }}>{owner.share}</span>
                            </div>
                            <div style={{ color:'#475569', lineHeight:'1.8' }}>
                              <div style={{ display: 'flex', gap: '8px' }}><span>🆔</span> {owner.id}</div>
                              <div style={{ display: 'flex', gap: '8px' }}><span>📅</span> {owner.date} <span style={{color: '#94a3b8'}}>({owner.reason})</span></div>
                              <div style={{ fontSize:'0.85rem', color:'#64748b', marginTop:'8px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>📍 {owner.address}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isLoading && (
                      <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>데이터가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 공통 버튼 (수정/닫기) */}
              <div style={{ display: 'flex', gap: '12px', padding: '20px 24px', borderTop: '1px solid #f3f4f6', backgroundColor: '#fff', position: 'sticky', bottom: 0 }}>
                <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem' }}>정보 수정</button>
                <button onClick={resetSelection} style={{ flex: 1, padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: '#f1f5f9', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem', color: '#475569' }}>패널 닫기</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* 세움터 로그인 팝업 */}
      {showSeumterLogin && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '320px', backgroundColor: 'white', padding: '28px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', zIndex: 2000 }}>
          <h3 style={{ margin: '0 0 20px 0', textAlign: 'center', fontSize: '1.2rem' }}>세움터 로그인</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '15px', textAlign: 'center' }}>공식 건축물대장 조회를 위해<br/>ID/PW가 필요합니다.</p>
          <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} placeholder="아이디" />
          <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} style={{ width: '100%', padding: '12px', marginBottom: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} placeholder="비밀번호" />
          <button onClick={runSeumterInquiry} style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{isLoading ? '로그인 중...' : '인증 및 조회 시작'}</button>
          <button onClick={() => setShowSeumterLogin(false)} style={{ width: '100%', marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>나중에 하기</button>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
