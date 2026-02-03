import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import PinForm from './PinForm';
import StackForm from './StackForm';
import SeumterModal from './SeumterModal';

// CSS 모듈 import
import styles from './RightPanel.module.css';

// ★ [수정 1] isMobile props 추가 (기본값 false)
const RightPanel = ({ isMobile = false }) => {
  const {
    selectedPin, isEditMode, isCreating, resetSelection, setIsEditMode,
    isStackMode
  } = useMap();

  // ★ [수정 2] 기존의 windowWidth 감지 및 모바일 차단 로직 삭제
  // const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  // ... useEffect ...
  // if (isMobile) return null;  <-- 이 부분이 삭제됨

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

  // --- [상태] 이미지 확대 모달 제어 ---
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [enlargedImageSrc, setEnlargedImageSrc] = useState(null);

  // 핀이 바뀌면 결과창 및 모달 상태 초기화
  useEffect(() => {
    setViewMode('detail');
    setOwnerResults([]);
    setStatusMsg('');
    setIsImageModalOpen(false);
  }, [selectedPin?.id]);

  // ★ 표시 여부 체크 (모바일/PC 공통)
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
          if (prev.includes('장바구니')) return '문서 발급 신청 및 처리 대기 중 (최대 20초)...';
          if (prev.includes('발급')) return '데이터 다운로드 및 분석 중...';
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
  };

  // --- 이미지 모달 핸들러 ---
  const openImageModal = (src) => {
    setEnlargedImageSrc(src);
    setIsImageModalOpen(true);
  };
  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setEnlargedImageSrc(null);
  };

  // --- 렌더링 헬퍼 함수 ---
  const renderDetailRow = (label, value) => (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value || '-'}</span>
    </div>
  );

  const renderPriceInfo = (pin) => {
    const fmt = n => Number(n || 0).toLocaleString();
    const rows = [];
    if (pin.is_sale) rows.push({ label: '매매', text: `${fmt(pin.sale_price)}만원`, className: styles.badgeSale });
    if (pin.is_jeonse) rows.push({ label: '전세', text: `${fmt(pin.jeonse_deposit)}만원`, className: styles.badgeJeonse });
    if (pin.is_rent) {
      const rentText = `보증금 ${fmt(pin.rent_deposit)} / 월 ${fmt(pin.rent_amount)}`;
      rows.push({ label: '월세', text: rentText, className: styles.badgeRent });
    }
    return (
      <div className={styles.priceList}>
        {rows.map((r, i) => (
          <div key={i} className={styles.priceRow}>
            <span className={`${styles.priceBadge} ${r.className}`}>{r.label}</span>
            <span className={styles.priceValue}>{r.text}</span>
          </div>
        ))}
      </div>
    );
  };

  // --- 이미지 데이터 유연하게 가져오기 ---
  const getImageList = (pin) => {
    if (!pin) return [];

    // 1. [중요] PinForm에서 저장하는 이름인 'image_urls' 확인
    if (Array.isArray(pin.image_urls) && pin.image_urls.length > 0) {
      return pin.image_urls;
    }
    // 2. 'images' 배열
    if (Array.isArray(pin.images) && pin.images.length > 0) {
      return pin.images;
    }
    // 3. 단일 'image_url'
    if (pin.image_url) return [pin.image_url];
    // 4. 기타
    if (pin.imageUrl) return [pin.imageUrl];
    if (pin.photo) return [pin.photo];

    return [];
  };

  const imageList = getImageList(selectedPin);
  const displayImages = imageList.slice(0, 3);
  const hasMoreImages = imageList.length > 3;

  return (
    // ★ [수정 3] isMobile 여부에 따라 스타일 클래스 변경 (mobilePanel vs panel)
    <div className={isMobile ? styles.mobilePanel : styles.panel}>
      <SeumterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={seumterData}
        onConfirm={handleOwnerInquiry}
      />

      <div className={styles.scrollArea}>
        {isStackMode ? <StackForm /> : (isCreating || isEditMode) ? (
          <PinForm mode={isEditMode ? 'edit' : 'create'} />
        ) : (
          selectedPin && (
            <div className={styles.contentContainer}>
              
              <div className={styles.paddingArea}>
                {/* 1. 상단 탭 */}
                {ownerResults.length > 0 && (
                  <div className={styles.tabContainer}>
                    <button 
                      onClick={() => setViewMode('detail')} 
                      className={`${styles.tabButton} ${viewMode === 'detail' ? styles.active : ''}`}
                    >
                      물건정보
                    </button>
                    <button 
                      onClick={() => setViewMode('ownerResult')} 
                      className={`${styles.tabButton} ${viewMode === 'ownerResult' ? styles.active : ''}`}
                    >
                      소유자현황
                    </button>
                  </div>
                )}

                {viewMode === 'detail' ? (
                  <>
                    {/* 2. 기본 정보 헤더 */}
                    <div className={styles.headerInfo}>
                      <span className={styles.typeTag}>{selectedPin.property_type || '부동산'}</span>
                      <h2 className={styles.buildingTitle}>{selectedPin.building_name || '매물 정보'}</h2>
                      <p className={styles.addressText}>{selectedPin.address} {selectedPin.detailed_address || ''}</p>
                    </div>

                    {/* 3. 가격 섹션 */}
                    <div className={styles.priceSection}>
                      {renderPriceInfo(selectedPin)}
                    </div>

                    {/* 4. 상세 제원 */}
                    <div className={styles.imageSection}>
                      <h3 className={styles.sectionTitle}>상세 제원</h3>
                      {renderDetailRow("메인 키워드", selectedPin.keywords)}
                      {renderDetailRow("전용 면적", selectedPin.area ? `${selectedPin.area}평` : "-")}
                      {renderDetailRow("층수 정보", `${selectedPin.floor || '-'}층 / ${selectedPin.total_floors || '-'}층`)}
                      {renderDetailRow("관리비", selectedPin.maintenance_fee ? `${Number(selectedPin.maintenance_fee).toLocaleString()}원` : "정보 없음")}
                      {renderDetailRow("등록일자", selectedPin.created_at ? new Date(selectedPin.created_at).toLocaleDateString() : "-")}
                    </div>

                    {/* 5. 상세 설명 */}
                    <div className={styles.imageSection}>
                      <h3 className={styles.sectionTitle}>상세 설명</h3>
                      <div className={styles.memoBox}>
                        {selectedPin.notes || "등록된 메모가 없습니다."}
                      </div>
                    </div>

                    {/* 6. 사진 갤러리 */}
                    {imageList.length > 0 && (
                        <div className={styles.imageSection}>
                             <h3 className={styles.sectionTitle}>매물 사진</h3>
                             <div className={styles.imageGrid}>
                                 {displayImages.map((imgSrc, index) => {
                                     const isLastItem = index === 2;
                                     const showOverlay = isLastItem && hasMoreImages;
                                     const overlayCount = imageList.length - 3;

                                     return (
                                         <div key={index}
                                              onClick={() => openImageModal(imgSrc)}
                                              className={styles.imageItem}
                                         >
                                             <img src={imgSrc} alt={`매물 ${index + 1}`} className={styles.thumbnailImage} />
                                             {showOverlay && (
                                                 <div className={styles.moreOverlay}>
                                                     +{overlayCount > 0 ? overlayCount + 1 : '...'}
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {Array.from({ length: 3 - displayImages.length }).map((_, i) => (
                                      <div key={`empty-${i}`} className={styles.emptyImage}></div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* 7. 분석 버튼 그룹 */}
                    <div className={styles.actionButtonGroup}>
                      <button onClick={handleInquiryClick} disabled={isLoading} className={styles.inquiryBtn}>
                        {isLoading ? '데이터 연동 중...' : '📋 전유부/소유자 실시간 조회'}
                      </button>
                      <button onClick={handleAIAnalysis} className={styles.aiBtn}>
                        ✨ AI 입지 및 가치 분석
                      </button>
                    </div>
                  </>
                ) : (
                  /* 소유자 결과 모드 */
                  <div className={styles.ownerModeContainer}>
                    <div className={styles.ownerHeader}>
                      <h3 className={styles.ownerHeaderTitle}>소유자 분석 리스트</h3>
                      <button onClick={() => setViewMode('detail')} className={styles.backButton}>정보 돌아가기</button>
                    </div>

                    {/* 로딩 바 */}
                    {isLoading && (
                      <div className={styles.loadingBox}>
                        <div className={styles.loadingText}>🔄 {statusMsg}</div>
                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill}></div>
                        </div>
                      </div>
                    )}

                    {!isLoading && ownerResults.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
                        {ownerResults.map((owner, idx) => (
                          <div key={idx} className={styles.ownerCard}>
                            <div className={styles.ownerNameRow}>
                                <span>👤 {owner.name}</span>
                                <span className={styles.ownerShare}>{owner.share}</span>
                            </div>
                            <div className={styles.ownerDetail}>
                              <div className={styles.ownerInfoRow}><span>🆔</span> {owner.id}</div>
                              <div className={styles.ownerInfoRow}><span>📅</span> {owner.date} <span style={{color: '#94a3b8'}}>({owner.reason})</span></div>
                              <div className={styles.ownerAddress}>📍 {owner.address}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : !isLoading && (
                      <div className={styles.emptyData}>데이터가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 고정 바 */}
              <div className={styles.bottomBar}>
                <button onClick={() => setIsEditMode(true)} className={styles.editBtn}>정보 수정</button>
                <button onClick={resetSelection} className={styles.closeBtn}>패널 닫기</button>
              </div>
            </div>
          )
        )}
      </div>

      {/* 세움터 로그인 팝업 */}
      {showSeumterLogin && (
        <div className={styles.loginPopup}>
          <h3 className={styles.loginTitle}>세움터 로그인</h3>
          <p className={styles.loginDesc}>공식 건축물대장 조회를 위해<br/>ID/PW가 필요합니다.</p>
          <input type="text" value={seumterId} onChange={e => setSeumterId(e.target.value)} className={styles.loginInput} placeholder="아이디" />
          <input type="password" value={seumterPw} onChange={e => setSeumterPw(e.target.value)} className={styles.loginInput} style={{ marginBottom: '24px' }} placeholder="비밀번호" />
          <button onClick={runSeumterInquiry} className={styles.inquiryBtn}>{isLoading ? '로그인 중...' : '인증 및 조회 시작'}</button>
          <button onClick={() => setShowSeumterLogin(false)} className={styles.loginCancelBtn}>나중에 하기</button>
        </div>
      )}

      {/* 이미지 확대 모달 */}
      {isImageModalOpen && enlargedImageSrc && (
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
            <img
                src={enlargedImageSrc}
                alt="확대 이미지"
                className={styles.enlargedImage}
                onClick={(e) => e.stopPropagation()} 
            />
            <button onClick={closeImageModal} className={styles.closeImageBtn}>&times;</button>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
