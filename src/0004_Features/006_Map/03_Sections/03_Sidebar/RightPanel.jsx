import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { useMapData } from '../../04_Hooks/useMapData';
import { usePinForm } from '../../04_Hooks/usePinForm';
import StackForm from './StackForm';
import PinForm from './PinForm';

const RightPanel = ({ isOpen, onClose }) => {
  const { 
    selectedPin, 
    isStackMode, 
    resetSelection 
  } = useMapData();
  
  const { isCreating, isEditMode, setIsEditMode } = usePinForm();

  // --- [상태] 조회 프로세스 관리 ---
  const [inquiryStatus, setInquiryStatus] = useState('idle'); // idle, login_input, processing, unit_select, complete, error
  const [processLogs, setProcessLogs] = useState([]); // 터미널 로그 메시지
  const [seumterId, setSeumterId] = useState('');     // 아이디 (기본값 필요시 설정)
  const [seumterPw, setSeumterPw] = useState('');     // 비번
  
  // 조회 결과 데이터
  const [unitList, setUnitList] = useState([]);       // 1차 조회된 건물/호실 목록
  const [pnuMapping, setPnuMapping] = useState(null); // 주소 매핑 정보
  const [ownerList, setOwnerList] = useState([]);     // 최종 소유자 정보

  // 핀이 바뀌면 상태 초기화
  useEffect(() => {
    if (!selectedPin) {
      resetInquiryState();
    }
  }, [selectedPin]);

  const resetInquiryState = () => {
    setInquiryStatus('idle');
    setProcessLogs([]);
    setUnitList([]);
    setOwnerList([]);
    setPnuMapping(null);
  };

  // --- [로그 UI] 터미널 메시지 추가 ---
  const addLog = (msg) => {
    setProcessLogs(prev => [...prev, msg]);
  };

  // --- [STEP 1] 조회 시작 및 로그인 체크 ---
  const handleStartInquiry = () => {
    if (inquiryStatus === 'complete' && ownerList.length > 0) {
        if(!window.confirm('기존 조회 결과를 지우고 다시 조회하시겠습니까?')) return;
        resetInquiryState();
    }

    if (!seumterId || !seumterPw) {
      setInquiryStatus('login_input');
    } else {
      runUnitInquiry();
    }
  };

  // --- [STEP 2] 건물/호실 목록 조회 (/units) ---
  const runUnitInquiry = async () => {
    setInquiryStatus('processing');
    setProcessLogs([]); 
    addLog("🚀 세움터 접속 시도...");

    try {
      addLog(`📡 [1단계] 주소 분석 및 건물 대장 조회 중...`);
      addLog(`👉 대상: ${selectedPin.address}`);

      // 백엔드 호출 (포트 3002)
      const response = await axios.post('http://localhost:3002/units', {
        id: seumterId,
        pw: seumterPw,
        address: selectedPin.address
      });

      const result = response.data;
      if (result.success) {
        setPnuMapping(result.pnuMapping);
        
        // 유효한 매물(전유부)이 있는지 확인
        const units = result.units || [];
        const normal = result.normalList || [];
        
        // 전유부(아파트/집합)가 있으면 그거 우선, 없으면 일반건물
        const candidates = units.length > 0 ? units : normal;

        addLog(`✅ 1차 조회 성공! 건물/호실 ${candidates.length}개 발견`);

        if (candidates.length === 0) {
            addLog("⚠️ 조회된 표제부/전유부가 없습니다.");
            setInquiryStatus('error');
            return;
        }

        // 목록을 state에 저장하고 선택 단계로 전환
        setUnitList(candidates);
        
        // 만약 결과가 딱 1개라면 바로 소유자 조회로 넘어감 (자동화)
        if (candidates.length === 1) {
            addLog("⚡ 단일 매물 식별됨. 소유자 조회 자동 시작...");
            runOwnerInquiry(candidates[0], result.pnuMapping);
        } else {
            addLog("📋 조회할 호실을 아래에서 선택해주세요.");
            setInquiryStatus('unit_select');
        }

      } else {
        addLog(`❌ 조회 실패: ${result.message}`);
        setInquiryStatus('error');
      }
    } catch (e) {
      addLog(`❌ 통신 오류: ${e.message}`);
      setInquiryStatus('error');
    }
  };

  // --- [STEP 3] 최종 소유자 조회 (/owner) ---
  const runOwnerInquiry = async (targetItem, mappingData = pnuMapping) => {
    setInquiryStatus('processing'); // 다시 로그 모드로
    addLog(`🔍 [2단계] '${targetItem.dong || targetItem.dongNm || ''} ${targetItem.ho || targetItem.hoNm || ''}' 소유자 확인 중...`);
    addLog("⏳ 장바구니 담기 및 발급 신청 (약 5~10초 소요)");

    try {
      const response = await axios.post('http://localhost:3002/owner', {
        id: seumterId,
        pw: seumterPw,
        item: targetItem,
        mapping: mappingData
      });

      if (response.data.success) {
        const owners = response.data.data;
        addLog(`🎉 조회 완료! 소유자 ${owners.length}명 확인됨.`);
        setOwnerList(owners);
        setInquiryStatus('complete');
      } else {
        addLog(`❌ 소유자 파싱 실패: ${response.data.message}`);
        setInquiryStatus('error');
      }
    } catch (e) {
      addLog(`❌ 서버 오류: ${e.message}`);
      setInquiryStatus('error');
    }
  };


  // 가격 렌더링 (기존 유지)
  const renderPriceInfo = (pin) => {
    if (!pin) return null;
    const type = pin.trade_type || '매매';
    const price = pin.price ? `${(pin.price / 10000).toLocaleString()}억` : '-';
    const deposit = pin.deposit ? `${(pin.deposit / 10000).toLocaleString()}억` : '-';
    const monthly = pin.monthly_fee ? `${pin.monthly_fee.toLocaleString()}만` : '-';

    if (type === '매매') return <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#16a34a' }}>매매 {price}</div>;
    if (type === '전세') return <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>전세 {deposit}</div>;
    return <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d97706' }}>월세 {deposit} / {monthly}</div>;
  };

  if (!isOpen) return null;

  return (
    <div className={`
      ${isStackMode ? 'w-[420px]' : 'w-[420px]'}
    `} style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      bottom: '100px', 
      height: 'calc(100vh - 110px)', 
      backgroundColor: 'white', 
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', 
      zIndex: 1500,
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* --- 메인 컨텐츠 영역 --- */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {isStackMode ? <StackForm /> : (isCreating || isEditMode) ? (
          <div style={{ padding: '0' }}>
            <PinForm mode={isEditMode ? 'edit' : 'create'} />
          </div>
        ) : (
          selectedPin && (
            <div style={{ padding: '24px' }}>
              
              {/* 기본 매물 정보 */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {selectedPin.property_type || '구분없음'}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '8px 0' }}>
                  {selectedPin.building_name || selectedPin.ho_name || '이름 없음'}
                </h2>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>{selectedPin.address}</p>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginBottom: '24px' }}>
                {renderPriceInfo(selectedPin)}
              </div>
              
              {/* --- [조회 UI 섹션] --- */}
              <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                
                {/* 1. 로그인 입력 폼 */}
                {inquiryStatus === 'login_input' && (
                  <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem' }}>🔐 세움터 로그인</h4>
                    <input type="text" placeholder="아이디" value={seumterId} onChange={(e) => setSeumterId(e.target.value)}
                      style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    <input type="password" placeholder="비밀번호" value={seumterPw} onChange={(e) => setSeumterPw(e.target.value)}
                      style={{ width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleStartInquiry} style={{ flex: 1, padding: '10px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>조회 시작</button>
                      <button onClick={() => setInquiryStatus('idle')} style={{ width: '60px', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>취소</button>
                    </div>
                  </div>
                )}

                {/* 2. 초기 조회 버튼 */}
                {inquiryStatus === 'idle' && (
                  <button onClick={handleStartInquiry} 
                    style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                    📋 전유부(소유자) 조회
                  </button>
                )}

                {/* 3. 진행 로그 (터미널 뷰) */}
                {(inquiryStatus === 'processing' || inquiryStatus === 'error') && (
                  <div style={{ backgroundColor: '#1f2937', color: '#10b981', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace', marginBottom: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {processLogs.map((log, i) => (
                      <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #374151', paddingBottom: '2px' }}>{`> ${log}`}</div>
                    ))}
                    {inquiryStatus === 'processing' && (
                      <div style={{ color: '#9ca3af', fontStyle: 'italic', marginTop: '4px' }}>
                        <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>Processing...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. 호실 선택 리스트 (결과가 여러 개일 때) */}
                {inquiryStatus === 'unit_select' && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '10px', backgroundColor: '#f3f4f6', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb' }}>
                            호실을 선택하세요
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {unitList.map((unit, idx) => (
                                <div key={idx} onClick={() => runOwnerInquiry(unit)}
                                    style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.9rem' }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#eff6ff'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                                >
                                    🏢 <strong>{unit.dong || unit.dongNm || ''}</strong> {unit.ho || unit.hoNm || '호수미기재'} 
                                    <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '6px' }}>({unit.area || 0}㎡)</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. ★ 최종 결과 카드 (성공 시) */}
                {inquiryStatus === 'complete' && (
                  <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>소유자 목록 ({ownerList.length})</h3>
                      <button onClick={resetInquiryState} style={{ fontSize: '0.8rem', color: '#6b7280', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>다시 조회</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {ownerList.map((owner, idx) => (
                        <div key={idx} style={{ padding: '14px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#111827' }}>
                              {owner.name} <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 'normal' }}>({owner.share})</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                              {owner.reason}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '4px' }}>🔢 {owner.id}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.3' }}>📍 {owner.address}</div>
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '6px', textAlign: 'right', fontStyle: 'italic' }}>
                            변동일: {owner.date}
                          </div>
                        </div>
                      ))}
                      {ownerList.length === 0 && <div style={{ padding:'20px', textAlign:'center', color:'#888' }}>소유자 정보가 없습니다.</div>}
                    </div>
                  </div>
                )}

              </div>

              {/* 하단 버튼 */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsEditMode(true)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', cursor: 'pointer' }}>수정</button>
                <button onClick={resetSelection} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f3f4f6', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
              </div>

            </div>
          )
        )}
      </div>
    </div>
  );
};

export default RightPanel;
