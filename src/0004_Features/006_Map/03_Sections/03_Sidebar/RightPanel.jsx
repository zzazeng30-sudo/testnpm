import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import StackForm from './StackForm';
import SeumterModal from './SeumterModal'; // 신규 추가

const RightPanel = () => {
  const { 
    selectedPin, isEditMode, isCreating, resetSelection, setIsEditMode,
    isStackMode 
  } = useMap();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // --- 상태 관리 ---
  const [showSeumterLogin, setShowSeumterLogin] = useState(false);
  const [seumterId, setSeumterId] = useState('zzazeng10');
  const [seumterPw, setSeumterPw] = useState('Dlxogh12!');
  const [isLoading, setIsLoading] = useState(false);
  
  const [seumterData, setSeumterData] = useState(null); // 조회된 데이터 저장
  const [isModalOpen, setIsModalOpen] = useState(false); // 결과 모달 제어

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
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '420px',
    backgroundColor: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
    zIndex: 1500, borderLeft: '1px solid #e5e7eb',
    paddingBottom: '100px', boxSizing: 'border-box'
  };

  // --- 세움터 통합 조회 로직 (백엔드 서버 연동) ---
  const runSeumterInquiry = async () => {
    if (!selectedPin?.address) return;
    setIsLoading(true);

    try {
      console.log("🚀 [시스템] 세움터 조회 서버 요청 시작");
      
      const response = await fetch('http://localhost:3002/units', { // PM2로 띄운 노드 서버 주소
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: seumterId,
          pw: seumterPw,
          address: selectedPin.address
        })
      });

      const result = await response.json();

      if (result.success) {
        setSeumterData(result); // { counts, units } 형태 수신
        setIsModalOpen(true);   // 팝업 열기
        setShowSeumterLogin(false); // 로그인창 닫기
      } else {
        throw new Error(result.message || "조회 결과가 없습니다.");
      }
    } catch (e) {
      alert("조회 실패: " + e.message);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPriceInfo = (pin) => {
    if (!pin) return '-';
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
            <span style={{ backgroundColor: p.bg, color: p.color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
              {p.label}
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#374151' }}>{p.text}</span>
          </div>
        ))}
      </div>
    );
  };

  const getTradeTypeString = (pin) => {
    const types = [];
    if (pin.is_sale) types.push('매매');
    if (pin.is_jeonse) types.push('전세');
    if (pin.is_rent) types.push('월세');
    return types.join(', ') || '-';
  };

  const renderDetailRow = (label, value, isLongText = false) => (
    <div key={label} style={{display:'flex', marginBottom:'12px', borderBottom:'1px solid #f9fafb', paddingBottom:'8px'}}>
        <span style={{width:'80px', color:'#6b7280', fontSize:'0.9rem', fontWeight:'600', flexShrink: 0}}>{label}</span>
        <span style={{ flex:1, color:'#111827', fontSize:'0.95rem', whiteSpace: isLongText ? 'pre-wrap' : 'normal', lineHeight: isLongText ? '1.5' : '1.2' }}>
          {value || '-'}
        </span>
    </div>
  );

  return (
    <div style={panelStyle}>
      {/* --- 세움터 결과 팝업 --- */}
      <SeumterModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={seumterData} 
      />

      {/* --- 세움터 로그인창 --- */}
      {showSeumterLogin && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '320px', backgroundColor: 'white', padding: '24px', borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', zIndex: 2000, border: '1px solid #f3f4f6', 
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <h3 style={{margin: 0, fontSize: '1.25rem', fontWeight: '800'}}>세움터 로그인</h3>
          <div>
            <label style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px', display: 'block'}}>아이디</label>
            <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #d1d5db'}} />
          </div>
          <div>
            <label style={{fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px', display: 'block'}}>비밀번호</label>
            <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #d1d5db'}} />
          </div>
          <div style={{display:'flex', gap:'10px', marginTop: '8px'}}>
            <button onClick={runSeumterInquiry} disabled={isLoading} style={{flex:2, padding:'12px', backgroundColor:isLoading ? '#9ca3af' : '#3b82f6', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>
              {isLoading ? '조회 중...' : '조회 시작'}
            </button>
            <button onClick={() => setShowSeumterLogin(false)} style={{flex:1, padding:'12px', backgroundColor:'#f3f4f6', color:'#374151', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>취소</button>
          </div>
        </div>
      )}

      {isStackMode ? (
        <StackForm />
      ) : (isCreating || isEditMode) ? (
        <PinForm mode={isEditMode ? 'edit' : 'create'} />
      ) : (
        selectedPin && (
          <div style={{padding:'24px', overflowY: 'auto', height: '100%'}}>
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
             {renderDetailRow("거래 유형", getTradeTypeString(selectedPin))}
             {renderDetailRow("면적", selectedPin.area ? `${selectedPin.area}평` : '')}
             {renderDetailRow("층수", selectedPin.floor ? `${selectedPin.floor}층` : '')}
             {renderDetailRow("관리비", selectedPin.maintenance_fee ? `${Number(selectedPin.maintenance_fee).toLocaleString()}만원` : '')}

             <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
               <button onClick={() => setShowSeumterLogin(true)} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '12px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                 📋 건축물대장(전유부) 조회
               </button>

               <div style={{ display: 'flex', gap: '10px' }}>
                 <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>수정</button>
                 <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
               </div>
             </div>
          </div>
        )
      )}
    </div>
  );
};

export default RightPanel;
