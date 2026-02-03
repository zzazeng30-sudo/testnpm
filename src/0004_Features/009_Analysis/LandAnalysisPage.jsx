import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import styles from './LandAnalysis.module.css';
import { fetchPnuListInPolygon } from '../../services/vworldService';
import { fetchFineGrainedData } from '../../services/buildingService';
import { seumterService } from '../../services/seumterService';

const LandAnalysisPage = () => {
  // ==========================================
  // [SECTION 1] 상태 관리 (States)
  // ==========================================
  const [results, setResults] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("영역 그리기 버튼을 눌러 분석을 시작하세요.");

  // 세움터 로그인 관련 상태
  const [isSeumterLoginOpen, setIsSeumterLoginOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInputs, setLoginInputs] = useState({ id: '', pw: '' });
  const [seumterCredentials, setSeumterCredentials] = useState(null);

  // 지도 관련 참조(Refs)
  const mapRef = useRef(null);
  const containerRef = useRef(null); 
  const polylineRef = useRef(null);
  const polygonRef = useRef(null);
  const pointsRef = useRef([]);

  // 데이터 추출 항목 설정 상태
  const [fieldOptions, setFieldOptions] = useState([
    { id: 'platPlc', label: '대지위치', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'newPlatPlc', label: '도로명대지위치', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'bldNm', label: '건물명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mgmBldrgstPk', label: '관리번호(PK)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'jiyukCdNm', label: '지역코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'jiguCdNm', label: '지구코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'guyukCdNm', label: '구역코드명', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mainPurpsCdNm', label: '주용도', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'strctCdNm', label: '주구조', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'roofCdNm', label: '지붕구조', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'heit', label: '높이(m)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'grndFlrCnt', label: '지상층수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'ugrndFlrCnt', label: '지하층수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'platArea', label: '대지면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'archArea', label: '건축면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'totArea', label: '연면적(㎡)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'bcRat', label: '건폐율(%)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'vlRat', label: '용적률(%)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'useAprDay', label: '사용승인일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'pmsDay', label: '허가일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'stcnsDay', label: '착공일', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'totPkngCnt', label: '총주차수', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'rideUseElvtCnt', label: '승강기(승용)', catId: 1, category: '1.표제부(기본개요)', checked: true },
    { id: 'mainBldCnt', label: '주건축물수', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'atchBldCnt', label: '부속건축물수', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'hhldCnt', label: '세대수(총괄)', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'fmlyCnt', label: '가구수(총괄)', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'gnBldGrade', label: '친환경등급', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'engrGrade', label: '에너지효율', catId: 2, category: '2.총괄표제부', checked: false },
    { id: 'flrNoNm', label: '층명칭', catId: 4, category: '4.층별개요', checked: false },
    { id: 'flrGbCdNm', label: '층구분', catId: 4, category: '4.층별개요', checked: false },
    { id: 'strctCdNm', label: '구조(층별)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'mainPurpsCdNm', label: '용도(층별)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'area', label: '면적(㎡)', catId: 4, category: '4.층별개요', checked: false },
    { id: 'atchBun', label: '부속번', catId: 5, category: '5.부속지번', checked: false },
    { id: 'atchJi', label: '부속지', catId: 5, category: '5.부속지번', checked: false },
    { id: 'atchRegstrGbCdNm', label: '부속대장구분', catId: 5, category: '5.부속지번', checked: false },
    { id: 'dongNm', label: '동명칭', catId: 6, category: '6.전유공용', checked: false },
    { id: 'hoNm', label: '호명칭', catId: 6, category: '6.전유공용', checked: false },
    { id: 'exposPubuseGbCdNm', label: '전유공용구분', catId: 6, category: '6.전유공용', checked: false },
    { id: 'area', label: '면적(㎡)', catId: 6, category: '6.전유공용', checked: false },
    { id: 'modeCdNm', label: '형식', catId: 7, category: '7.오수정화', checked: false },
    { id: 'capaPsper', label: '용량(인용)', catId: 7, category: '7.오수정화', checked: false },
    { id: 'capaLube', label: '용량(루베)', catId: 7, category: '7.오수정화', checked: false },
    { id: 'hsprc', label: '주택가격', catId: 8, category: '8.주택가격', checked: false },
    { id: 'stdDay', label: '기준일자', catId: 8, category: '8.주택가격', checked: false },
    { id: 'dongNm', label: '동명칭', catId: 9, category: '9.전유부', checked: false },
    { id: 'hoNm', label: '호명칭', catId: 9, category: '9.전유부', checked: false },
    { id: 'flrNo', label: '층번호', catId: 9, category: '9.전유부', checked: false },
    { id: 'jijiguCdNm', label: '지역지구명', catId: 10, category: '10.지역지구', checked: false },
    { id: 'reprYn', label: '대표여부', catId: 10, category: '10.지역지구', checked: false },
    { id: 'ownerName', label: '성명', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerJumin', label: '주민번호', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerAddr', label: '소유자주소', catId: 11, category: '11.소유자정보', checked: false }, // [수정] 엑셀 중복 방지
    { id: 'ownerShare', label: '지분', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerReason', label: '변동원인', catId: 11, category: '11.소유자정보', checked: false },
    { id: 'ownerDate', label: '변동일', catId: 11, category: '11.소유자정보', checked: false },
  ]);

  // ==========================================
  // [SECTION 2] 지도 초기화
  // ==========================================
  useEffect(() => {
    const initMap = () => {
      const container = containerRef.current;
      if (!container) return;
      const map = new window.kakao.maps.Map(container, { center: new window.kakao.maps.LatLng(36.7857, 127.0080), level: 3 });
      mapRef.current = map;
      polylineRef.current = new window.kakao.maps.Polyline({ strokeWeight: 4, strokeColor: '#0984e3', strokeOpacity: 0.8 });
      map.setZoomable(true);

      window.kakao.maps.event.addListener(map, 'click', (e) => {
        if (!window.DRAW_MODE) return;
        const path = polylineRef.current.getPath();
        path.push(e.latLng);
        polylineRef.current.setPath(path);
        polylineRef.current.setMap(map);
        pointsRef.current.push(e.latLng);
      });

      window.kakao.maps.event.addListener(map, 'rightclick', async (e) => {
        if (!window.DRAW_MODE || pointsRef.current.length < 2) return;
        window.DRAW_MODE = false; setIsDrawing(false);
        pointsRef.current.push(e.latLng);
        polylineRef.current.setMap(null);
        const polygon = new window.kakao.maps.Polygon({ path: pointsRef.current, strokeWeight: 2, strokeColor: '#0984e3', fillOpacity: 0.2, fillColor: '#0984e3' });
        polygon.setMap(map);
        polygonRef.current = polygon;
        
        setStatusMsg("지번 추출 중... (대량 데이터일 경우 시간이 소요됩니다)");
        const pnuList = await fetchPnuListInPolygon(pointsRef.current.map(p => ({ lat: p.getLat(), lng: p.getLng() })));
        setResults(pnuList.map(item => ({ ...item, detail: null, status: 'ready', reason: '' })));
        setProgress(0);
        setStatusMsg(`${pnuList.length}건 확인됨. 분석을 시작하세요.`);
      });
    };
    if (window.kakao && window.kakao.maps) window.kakao.maps.load(initMap);
  }, []);

  const startDrawing = () => {
    window.DRAW_MODE = true; setIsDrawing(true); setResults([]); pointsRef.current = []; setProgress(0);
    if (polygonRef.current) polygonRef.current.setMap(null);
    if (polylineRef.current) polylineRef.current.setPath([]);
  };

  // ==========================================
  // [SECTION 3] 데이터 수집 및 분석 (완전 분리 & 동시 실행)
  // ==========================================
  const handleFetchData = async () => {
    const selectedCatIds = [...new Set(
      fieldOptions.filter(opt => opt.checked).map(opt => opt.catId)
    )];

    if (selectedCatIds.length === 0) return alert("최소 1개 이상의 항목을 선택해주세요.");

    // 소유자 정보 체크되었으나 로그인이 안된 경우
    if (selectedCatIds.includes(11) && !isLoggedIn) {
        return alert("소유자 정보를 수집하려면 세움터 로그인이 필요합니다.");
    }

    setIsPopupOpen(false); 
    setLoading(true); 
    
    // 진행률 계산을 위한 변수
    let totalTasks = results.length * 2; // (공공데이터 + 세움터)
    let completedTasks = 0;

    const updateProgress = () => {
        completedTasks++;
        // 100%를 넘지 않게 처리
        setProgress(Math.min(100, Math.round((completedTasks / totalTasks) * 100)));
    };

    // ---------------------------------------------------------
    // Job 1: 공공데이터포털 (건축물대장) - 5개씩 병렬 처리
    // ---------------------------------------------------------
    const runPublicDataJob = async () => {
        const publicCats = selectedCatIds.filter(id => id !== 11);
        if (publicCats.length === 0) {
            completedTasks += results.length; // 할 일 없으면 완료 처리
            return;
        }

        const BATCH_SIZE = 5;
        // i는 인덱스
        for (let i = 0; i < results.length; i += BATCH_SIZE) {
            const batchIndices = [];
            for(let j=0; j<BATCH_SIZE; j++) {
                if(i+j < results.length) batchIndices.push(i+j);
            }

            // 배치 단위 병렬 요청
            await Promise.all(batchIndices.map(async (idx) => {
                const item = results[idx]; // 초기 상태의 item 참조 (PNU 등은 안변함)
                
                try {
                    console.log(`📡 [공공데이터] 분석 시작 (${idx+1}/${results.length}): ${item.address}`);
                    const detail = await fetchFineGrainedData(item.pnu, publicCats);
                    const hasData = (detail !== "데이터 없음" && detail !== "선택된 항목 없음");

                    // ★ 함수형 업데이트로 상태 갱신 (Race Condition 방지)
                    setResults(prevResults => {
                        const next = [...prevResults];
                        const target = next[idx];
                        const existingDetail = target.detail || {};
                        
                        next[idx] = {
                            ...target,
                            detail: hasData ? { ...existingDetail, ...detail } : existingDetail,
                            // 이미 완료(done) 상태면 유지, 아니면 데이터 있을때만 done
                            status: (target.status === 'done' || hasData) ? 'done' : target.status
                        };
                        return next;
                    });
                } catch (e) {
                    console.error(`❌ [공공데이터] 실패: ${item.address}`);
                }
                
                updateProgress();
            }));
        }
        console.log("✅ [Job 1] 공공데이터 수집 완료");
    };

    // ---------------------------------------------------------
    // Job 2: 세움터 (소유자 정보) - 1개씩 순차 처리 (안정성)
    // ---------------------------------------------------------
    const runSeumterJob = async () => {
        if (!isLoggedIn || !selectedCatIds.includes(11) || !seumterCredentials) {
            completedTasks += results.length;
            return;
        }

        for (let i = 0; i < results.length; i++) {
            const item = results[i]; // 초기 상태 참조

            try {
                console.log(`📡 [세움터] 소유자 조회 시작 (${i+1}/${results.length}): ${item.address}`);
                setStatusMsg(`[세움터] 소유자 조회 중... (${i+1}/${results.length})`);
                
                const ownerList = await seumterService.getOwnerInfo(
                    item.address, 
                    seumterCredentials.id, 
                    seumterCredentials.pw
                );

                if (ownerList && ownerList.length > 0) {
                    setResults(prevResults => {
                        const next = [...prevResults];
                        const target = next[i];
                        const existingDetail = target.detail || {};
                        
                        next[i] = {
                            ...target,
                            detail: { ...existingDetail, ownerInfo: ownerList },
                            status: 'done' // 소유자 정보 찾았으면 성공 처리
                        };
                        return next;
                    });
                }
            } catch (error) {
                console.error(`❌ [세움터] 실패: ${item.address}`);
            }
            
            updateProgress();
        }
        console.log("✅ [Job 2] 세움터 수집 완료");
    };

    // ★ 두 작업을 동시에 시작 (await Promise.all)
    setStatusMsg("데이터 분석을 시작합니다...");
    await Promise.all([runPublicDataJob(), runSeumterJob()]);

    setLoading(false); 
    console.log("🏁 모든 분석 작업 종료");
    setStatusMsg("분석 완료.");
  };

  // ==========================================
  // [SECTION 4] 유틸리티 (Excel, Login)
  // ==========================================
  const handleDownloadExcel = () => {
    if (results.length === 0) return alert("데이터가 없습니다.");
    const selectedHeaders = fieldOptions.filter(f => f.checked);
    const excelData = [];
    
    results.forEach(item => {
      const baseInfo = { "주소": item.address, "PNU": item.pnu };
      const owners = (item.detail && item.detail.ownerInfo) ? item.detail.ownerInfo : [{}];
      
      owners.forEach((owner, ownerIdx) => {
          const row = { ...baseInfo };
          if(owners.length > 1) row["순번"] = ownerIdx + 1;

          selectedHeaders.forEach(h => {
            if (h.catId === 11) {
               if(h.id === 'ownerName') row[h.label] = owner.name || "-";
               else if(h.id === 'ownerJumin') row[h.label] = owner.id || "-";
               else if(h.id === 'ownerAddr') row[h.label] = owner.address || "-";
               else if(h.id === 'ownerShare') row[h.label] = owner.share || "-";
               else if(h.id === 'ownerReason') row[h.label] = owner.reason || "-";
               else if(h.id === 'ownerDate') row[h.label] = owner.date || "-";
               else row[h.label] = "-";
            }
            else if (item.detail && item.detail[h.id]) {
              row[h.label] = item.detail[h.id];
            } 
            else if (item.detail && item.detail.floorDetails && item.detail.floorDetails.length > 0 && item.detail.floorDetails[0][h.id]) {
               row[h.label] = item.detail.floorDetails[0][h.id];
            }
            else {
              row[h.label] = "-";
            }
          });
          excelData.push(row);
      });
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "종합분석결과");
    XLSX.writeFile(wb, `Building_Report_${new Date().getTime()}.xlsx`);
  };

  const handleLoginSubmit = () => {
    if (!loginInputs.id || !loginInputs.pw) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setSeumterCredentials({ id: loginInputs.id, pw: loginInputs.pw });
    setIsLoggedIn(true);
    setIsSeumterLoginOpen(false);
    setFieldOptions(prev => prev.map(f => f.catId === 11 ? { ...f, checked: true } : f));
    alert("로그인 정보가 임시 저장되었습니다.\n'분석 시작' 버튼을 누르면 이 계정으로 분석을 진행합니다.");
  };

  // ==========================================
  // [SECTION 5] 화면 렌더링
  // ==========================================
  const renderLoginPopup = () => {
    if (!isSeumterLoginOpen) return null;
    return (
      <div className={styles.modalOverlay} style={{zIndex: 2000}}>
        <div className={styles.documentModal} style={{width: '350px', height: 'auto', padding: '0', overflow: 'hidden'}}>
          <div className={styles.docHeader} style={{background: '#007bff', color: 'white', padding: '15px'}}>
            <h3 style={{margin:0, fontSize:'16px'}}>세움터 정보 입력</h3>
            <button onClick={() => setIsSeumterLoginOpen(false)} style={{color:'white'}}>✕</button>
          </div>
          <div className={styles.docBody} style={{padding: '25px', display:'flex', flexDirection:'column', gap:'10px'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'5px', lineHeight: '1.4'}}>
              <strong>로그인 정보</strong>를 입력하세요.<br/>입력된 정보로 세움터에 접속하여 분석을 진행합니다.
            </p>
            <input type="text" placeholder="세움터 아이디" value={loginInputs.id} onChange={(e) => setLoginInputs({...loginInputs, id: e.target.value})} style={{padding: '12px', border: '1px solid #ddd', borderRadius: '4px'}} />
            <input type="password" placeholder="비밀번호" value={loginInputs.pw} onChange={(e) => setLoginInputs({...loginInputs, pw: e.target.value})} style={{padding: '12px', border: '1px solid #ddd', borderRadius: '4px'}} />
            <button onClick={handleLoginSubmit} style={{marginTop: '10px', padding: '12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'}}>저장 및 닫기</button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailPopup = () => {
    if (!selectedItem || !selectedItem.detail) return null;
    const d = selectedItem.detail;
    const commonInfo = {
      address: d.platPlc || selectedItem.address,
      roadAddr: d.newPlatPlc || '-',
      bldName: d.bldNm || '-',
      pnu: selectedItem.pnu,
      date: d.useAprDay || d.crtnDay || '-'
    };
    return (
      <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
        <div className={styles.documentModal} onClick={e => e.stopPropagation()} style={{maxWidth:'900px', width:'90%'}}>
          <div className={styles.docHeader}>
            <h2>건축물 통합 상세 정보</h2>
            <button onClick={() => setSelectedItem(null)}>✕</button>
          </div>
          <div className={styles.docBody} style={{maxHeight:'80vh', overflowY:'auto', padding:'20px'}}>
            <div className={styles.sectionTitle}>📍 기본 정보</div>
            <table className={styles.docTable}>
              <tbody>
                <tr><th>대지위치</th><td colSpan="3">{commonInfo.address}</td></tr>
                <tr><th>도로명주소</th><td colSpan="3">{commonInfo.roadAddr}</td></tr>
                <tr><th>건물명</th><td>{commonInfo.bldName}</td><th>PNU</th><td>{commonInfo.pnu}</td></tr>
              </tbody>
            </table>
            <div className={styles.sectionTitle} style={{marginTop:'20px'}}>👤 소유자 현황</div>
            <table className={styles.docTable}>
              <thead>
                <tr><th>성명</th><th>주민번호</th><th>주소</th><th>지분</th><th>변동일</th><th>변동원인</th></tr>
              </thead>
              <tbody>
                {d.ownerInfo ? d.ownerInfo.map((owner, idx) => (
                  <tr key={idx}><td>{owner.name}</td><td>{owner.id}</td><td>{owner.address}</td><td>{owner.share}</td><td>{owner.date}</td><td>{owner.reason}</td></tr>
                )) : <tr><td colSpan="6" style={{textAlign:'center', color:'#999'}}>소유자 정보가 없습니다. (혹은 수집 실패)</td></tr>}
              </tbody>
            </table>
            <div className={styles.sectionTitle} style={{marginTop:'20px'}}>🏢 건축물 개요</div>
            <table className={styles.docTable}>
              <tbody>
                <tr><th>대지면적</th><td>{d.platArea || '-'} ㎡</td><th>연면적</th><td>{d.totArea || '-'} ㎡</td></tr>
                <tr><th>건축면적</th><td>{d.archArea || '-'} ㎡</td><th>높이</th><td>{d.heit || '-'} m</td></tr>
                <tr><th>건폐율</th><td>{d.bcRat || '-'} %</td><th>용적률</th><td>{d.vlRat || '-'} %</td></tr>
                <tr><th>주용도</th><td>{d.mainPurpsCdNm || '-'}</td><th>주구조</th><td>{d.strctCdNm || '-'}</td></tr>
                <tr><th>지상/지하</th><td>지상 {d.grndFlrCnt || 0}층 / 지하 {d.ugrndFlrCnt || 0}층</td><th>승강기</th><td>승용 {d.rideUseElvtCnt || 0}대</td></tr>
              </tbody>
            </table>
            {d.floorDetails && d.floorDetails.length > 0 && (
              <>
                <div className={styles.sectionTitle} style={{marginTop:'20px'}}>📑 층별 현황</div>
                <table className={styles.docTable}>
                  <thead><tr><th>층명</th><th>구조</th><th>용도</th><th>면적(㎡)</th></tr></thead>
                  <tbody>
                    {d.floorDetails.map((f, i) => (
                      <tr key={i}><td>{f.flrNoNm}</td><td>{f.strctCdNm}</td><td>{f.mainPurpsCdNm}</td><td>{f.area}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboard}>
      <nav className={styles.topToolbar}>
        <div className={styles.logo}>BUILDING<span>INSIGHT</span></div>
        <div className={styles.actionGroup}>
          <button onClick={startDrawing} className={`${styles.btnNav} ${isDrawing ? styles.btnActive : ''}`}>✏️ 영역 그리기</button>
          <button onClick={() => setIsPopupOpen(true)} className={styles.btnNav} disabled={results.length === 0}>⚙️ 수집 항목 설정</button>
          <button onClick={handleDownloadExcel} className={styles.btnExcel} disabled={results.length === 0}>📊 엑셀 저장</button>
        </div>
      </nav>

      <main className={styles.mainLayout}>
        <div className={styles.mapContainer}>
          <div id="analysis-map-unique" ref={containerRef} className={styles.kakaoMap}></div>
          <div className={styles.mapStatusOverlay}>{statusMsg}</div>
        </div>
        <aside className={styles.sidePanel}>
          <div className={styles.panelHeader}>
            <h3>대상 목록 <span className={styles.badge}>{results.length}</span>
            {loading && <span className={styles.progressText}>({progress}%)</span>}</h3>
          </div>
          {loading && <div className={styles.progressBarWrapper}><div className={styles.progressBar} style={{ width: `${progress}%` }}></div></div>}
          <div className={styles.listContainer}>
            {results.map((item, i) => (
              <div key={i} className={styles.resultCard} onClick={() => item.status === 'done' && setSelectedItem(item)}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                    {item.status === 'done' ? "성공" : (item.status === 'fail' ? "없음" : "대기")}
                  </span>
                  <span className={styles.addrText}>{item.address}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {isPopupOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{width: '90%', maxWidth: '1200px', height: '92vh', minHeight: '850px', display: 'flex', flexDirection: 'column'}}>
            <div className={styles.modalHeader} style={{flexShrink: 0}}><h2>데이터 추출 항목 설정</h2></div>
            <div className={styles.docBody} style={{flexGrow: 1, padding:'20px', display: 'flex', gap: '20px', overflowY: 'auto'}}>
              <div style={{width: '320px', flexShrink: 0, height: '100%', paddingRight: '5px'}}>
                <div className={styles.categoryGroup} style={{border: '2px solid #007bff', padding: '15px', borderRadius: '8px', background: '#eef6fc', minHeight: '100%', boxSizing: 'border-box'}}>
                  <h4 style={{margin: '0 0 15px 0', borderBottom: '2px solid #007bff', paddingBottom: '5px', color: '#007bff'}}>
                    <label style={{cursor: 'not-allowed', display: 'flex', alignItems: 'center'}}>
                      <input type="checkbox" checked={true} disabled={true} style={{marginRight: '8px'}} />
                      1. 표제부(기본개요) (필수)
                    </label>
                  </h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {fieldOptions.filter(f => f.catId === 1).map(opt => (
                      <label key={opt.id} style={{display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'not-allowed', color: '#555'}}>
                        <input type="checkbox" checked={opt.checked} disabled={true} style={{marginRight: '8px'}} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{flexGrow: 1, height: '100%', paddingRight: '5px'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '15px', height: '100%'}}>
                  {[2, 4, 5, 6, 7, 8, 9, 10, 11].map(catId => {
                    const groupOptions = fieldOptions.filter(f => f.catId === catId);
                    const isAllChecked = groupOptions.length > 0 && groupOptions.every(o => o.checked);
                    let categoryLabel = groupOptions[0]?.category.split('.')[1] || `카테고리 ${catId}`;
                    if(catId === 11) categoryLabel = "소유자정보";
                    return (
                      <div key={catId} className={styles.categoryGroup} style={{border: '1px solid #ddd', padding: '10px', borderRadius: '8px', background: '#f9f9f9', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                        <h4 style={{margin: '0 0 10px 0', borderBottom: '2px solid #007bff', paddingBottom: '5px', color: '#333', flexShrink: 0}}>
                          <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
                            <input 
                              type="checkbox" 
                              checked={isAllChecked}
                              onChange={(e) => {
                                const newValue = e.target.checked;
                                if (catId === 11 && newValue === true && !isLoggedIn) {
                                  e.preventDefault();
                                  setIsSeumterLoginOpen(true);
                                  return;
                                }
                                setFieldOptions(fieldOptions.map(f => f.catId === catId ? { ...f, checked: newValue } : f));
                              }}
                              style={{marginRight: '8px'}}
                            />
                            {catId}. {categoryLabel}
                          </label>
                        </h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1}}>
                          {groupOptions.map(opt => (
                            <label key={opt.id} style={{display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer'}}>
                              <input 
                                type="checkbox" 
                                checked={opt.checked} 
                                onChange={(e) => {
                                    if (catId === 11 && e.target.checked && !isLoggedIn) {
                                        e.preventDefault();
                                        setIsSeumterLoginOpen(true);
                                        return;
                                    }
                                    setFieldOptions(fieldOptions.map(f => f.id === opt.id && f.catId === opt.catId ? {...f, checked: !f.checked} : f));
                                }}
                                style={{marginRight: '6px'}}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter} style={{flexShrink: 0}}>
              <button className={styles.btnStart} onClick={handleFetchData}>분석 시작</button>
              <button className={styles.btnCancel} onClick={() => setIsPopupOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && renderDetailPopup()}
      {isSeumterLoginOpen && renderLoginPopup()}
    </div>
  );
};

export default LandAnalysisPage;