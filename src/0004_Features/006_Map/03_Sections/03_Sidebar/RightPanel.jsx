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
  const [showSeumterLogin, setShowSeumterLogin] = useState(false);
  const [seumterId, setSeumterId] = useState('zzazeng10');
  const [seumterPw, setSeumterPw] = useState('Dlxogh12!');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seumterData, setSeumterData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  if (isMobile) return null;

  const isVisible = !!selectedPin || isEditMode || isCreating || isStackMode;
  if (!isVisible) return null;

  // [수정] 패널 전체 스타일: Flex 레이아웃 적용
  const panelStyle = {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', // 세로로 쌓이는 구조
    boxSizing: 'border-box',
    overflow: 'hidden' // 패널 자체는 스크롤을 막고 내부 영역만 허용
  };

  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    const PROXY_URL = "/api/v2/units"; 
    setIsLoading(true);
    try {
      const response = await fetch(PROXY_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: seumterId, pw: seumterPw, address: selectedPin.address })
      });
      const result = await response.json();
      if (result.success) {
        setSeumterData(result);
        setIsModalOpen(true);
        setShowSeumterLogin(false);
      } else {
        throw new Error(result.message || "조회 결과가 없습니다.");
      }
    } catch (e) {
      alert("조회 실패: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPriceInfo = (pin) => {
    const fmt = n => Number(n || 0).toLocaleString();
    const priceRows = [];
    if (pin.is_sale) priceRows.push({ label: '매매', text: `${fmt(pin.sale_price)}`, color: '#ef4444', bg: '#fee2e2' });
    if (pin.is_jeonse) priceRows.push({ label: '전세', text: `${fmt(pin.jeonse_deposit)}`, color: '#3b82f6', bg: '#dbeafe' });
    if (pin.is_rent) {
      const deposit = pin.rent_deposit ? fmt(pin.rent_deposit) : '0';
      const rent = fmt(pin.rent_amount);
      priceRows.push({ label: '월세', text: `${deposit} / ${rent}`, color: '#10b981', bg: '#d1fae5' });
    }
    if (priceRows.length === 0) return <span>-</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {priceRows.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: p.bg, color: p.color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>{p.label}</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#374151' }}>{p.text}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderDetailRow = (label, value) => (
    <div key={label} style={{display:'flex', marginBottom:'12px', borderBottom:'1px solid #f9fafb', paddingBottom:'8px'}}>
        <span style={{width:'80px', color:'#6b7280', fontSize:'0.9rem', fontWeight:'600', flexShrink: 0}}>{label}</span>
        <span style={{ flex:1, color:'#111827', fontSize:'0.95rem' }}>{value || '-'}</span>
    </div>
  );

  return (
    <div style={panelStyle}>
      <SeumterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} data={seumterData} />

      {/* [핵심 수정] 스크롤 가능한 컨테이너 생성 */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', // 내용이 넘칠 때만 스크롤바 생성
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        {isStackMode ? (
          <StackForm />
        ) : (isCreating || isEditMode) ? (
          /* PinForm이 들어갈 때 패딩을 여기서 한 번 더 잡아줌 */
          <div style={{ width: '100%' }}>
            <PinForm mode={isEditMode ? 'edit' : 'create'} />
          </div>
        ) : (
          selectedPin && selectedPin.id && (
            <div style={{padding:'24px'}}>
                <div style={{marginBottom:'20px'}}>
                  <span style={{backgroundColor:'#eff6ff', color:'#2563eb', padding:'4px 8px', borderRadius:'4px', fontSize:'0.8rem', fontWeight:'bold'}}>
                    {selectedPin.property_type || '매물'}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '5px 0', color:'#111827' }}>
                    {selectedPin.building_name || selectedPin.keywords || '매물 상세 정보'}
                  </h2>
                  <p style={{color:'#6b7280', fontSize:'0.9rem'}}>{selectedPin.address} {selectedPin.detailed_address}</p>
                </div>

                <div style={{padding:'20px', backgroundColor:'#f0fdf4', borderRadius:'12px', marginBottom:'24px', border:'1px solid #dcfce7'}}>
                   {renderPriceInfo(selectedPin)}
                </div>

                <h3 style={{fontSize:'1rem', fontWeight:'bold', borderBottom:'2px solid #f3f4f6', paddingBottom:'8px', marginBottom:'16px'}}>매물 정보</h3>
                {renderDetailRow("면적", selectedPin.area ? `${selectedPin.area}평` : '')}
                {renderDetailRow("층수", selectedPin.floor ? `${selectedPin.floor}층` : '')}

                <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setShowSeumterLogin(true)} style={{width:'100%', padding:'14px', borderRadius:'8px', backgroundColor:'#3b82f6', color:'white', fontWeight:'bold', cursor:'pointer', border:'none'}}>📋 전유부조회</button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600' }}>매물 수정</button>
                    <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontWeight: '600' }}>닫기</button>
                  </div>
                </div>
            </div>
          )
        )}
      </div>

      {/* 로그인창 오버레이 (스크롤 영역 외부에 배치하여 고정) */}
      {showSeumterLogin && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '320px', backgroundColor: 'white', padding: '24px', borderRadius: '16px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.1)', zIndex: 2000, border: '1px solid #f3f4f6',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <h3 style={{margin: 0}}>세움터 로그인</h3>
          <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} style={{padding:'10px', borderRadius:'4px', border:'1px solid #ccc'}} placeholder="아이디" />
          <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} style={{padding:'10px', borderRadius:'4px', border:'1px solid #ccc'}} placeholder="비밀번호" />
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={runSeumterInquiry} style={{flex:1, padding:'10px', backgroundColor:'#3b82f6', color:'white', border:'none', borderRadius:'4px'}}>{isLoading ? '조회 중...' : '확인'}</button>
            <button onClick={() => setShowSeumterLogin(false)} style={{flex:1, padding:'10px', backgroundColor:'#eee', border:'none', borderRadius:'4px'}}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
