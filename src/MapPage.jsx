// src/MapPage.jsx (수정)
import React from 'react';
import { MapProvider } from './contexts/MapContext';
import LeftPanel from './components/map/LeftPanel';
import KakaoMap from './components/map/KakaoMap';
import styles from './MapPage.module.css';
import { useMap } from './contexts/MapContext'; 

/* 21일차 (리팩토링): '껍데기' 컴포넌트 */
export default function MapPage({ session, mode = 'tour' }) {
  return (
    <MapProvider session={session} mode={mode}>
      <MapPageContent />
    </MapProvider>
  );
}

/* ★ (수정) useMap에서 가져오는 state 변경 */
function MapPageContent() {
  const {
    // PinSidebar용 state
    selectedPin, setSelectedPin, 
    loading, isGenerating, session, mode,
    customers, linkedCustomers,

    // (수정) 새 폼 state
    address, setAddress,
    detailedAddress, setDetailedAddress, 
    buildingName, setBuildingName,
    isSale, setIsSale,
    salePrice, setSalePrice,
    isJeonse, setIsJeonse,
    jeonseDeposit, setJeonseDeposit,
    jeonsePremium, setJeonsePremium,
    isRent, setIsRent,
    rentDeposit, setRentDeposit,
    rentAmount, setRentAmount,
    keywords, setKeywords,
    notes, setNotes,
    status, setStatus, 

    // ★ 사진 state
    imageUrls,
    isUploading,
    handleImageChange,
    handleImageRemove,
    
    // ★ 사진 뷰어 state
    viewingImage, setViewingImage,

    // ★ (추가) 지도 컨트롤 state
    mapType, setMapType,
    showCadastral, setShowCadastral,

    // PinSidebar용 handlers
    handleSidebarSave, handleDeletePin, handleGenerateIm, handleAddToTour,
    handleLinkCustomer, handleUnlinkCustomer, clearTempMarkerAndMenu,
    // ImModal용
    imContent, setImContent,
    // MapContextMenu용
    contextMenu, contextMenuRef, handleContextMenuAction,
    // KakaoMap용
    mapRef 
  } = useMap();

  return (
    <div className={styles.pageContainerMap}>
      
      {/* 1. 왼쪽 패널 (분리된 컴포넌트) */}
      <LeftPanel />
      
      {/* 2. 매물 정보 사이드바 (★ 폼 내부 JSX 수정 ★) */}
      <aside 
        className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        {selectedPin && (
          <div className={styles.sidebarContent}>
            {/* --- ★ (수정) 폼 시작 ★ --- */}
            <form key={selectedPin.id || 'new-pin'} onSubmit={handleSidebarSave}>
              <h2 className={styles.sidebarTitle}>
                {selectedPin.id ? '매물 정보 수정' : '새 매물 등록'}
              </h2>
              
              {/* --- 1. 소재 정보 --- */}
              <h3 className={styles.formSectionTitle}>소재 정보</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>주소 (자동 입력)</label>
                <input
                  className={styles.input}
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="핀을 찍은 곳의 주소"
                  required 
                  readOnly 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>상세 주소</label>
                <input
                  className={styles.input}
                  type="text"
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="예: 101동 101호"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>건물명</label>
                <input
                  className={styles.input}
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  placeholder="예: 현대아파트 101동"
                />
              </div>

              {/* --- 2. 거래 정보 --- */}
              <h3 className={styles.formSectionTitle}>거래 정보</h3>

              {/* --- 2.5. 거래 상태 (★ 기존 핀에만 보임) --- */}
              {selectedPin && selectedPin.id && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>거래 상태</label>
                  <select
                    className={styles.input} // .input 스타일 재사용
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="거래전">거래전</option>
                    <option value="거래중">거래중</option>
                    <option value="거래완료">거래완료</option>
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>거래 유형 (중복 가능)</label>
                {/* 체크박스 그룹 */}
                <div className={styles.checkboxGroup}>
                    <label className={styles.checkboxLabel}>
                        <input 
                            type="checkbox" 
                            className={styles.checkboxInput}
                            checked={isSale}
                            onChange={(e) => setIsSale(e.target.checked)}
                        />
                        매매
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input 
                            type="checkbox" 
                            className={styles.checkboxInput}
                            checked={isJeonse}
                            onChange={(e) => setIsJeonse(e.target.checked)}
                        />
                        전세
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input 
                            type="checkbox" 
                            className={styles.checkboxInput}
                            checked={isRent}
                            onChange={(e) => setIsRent(e.target.checked)}
                        />
                        월세
                    </label>
                </div>
              </div>

              {/* --- 2-1. 조건부 입력칸 (매매) --- */}
              {isSale && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>매매 금액 (만원)</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="숫자만 입력 (예: 10000)"
                  />
                </div>
              )}
              
              {/* --- 2-2. 조건부 입력칸 (전세) --- */}
              {isJeonse && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>전세 보증금 (만원)</label>
                    <input
                      className={styles.input}
                      type="number"
                      value={jeonseDeposit}
                      onChange={(e) => setJeonseDeposit(e.target.value)}
                      placeholder="숫자만 입력 (예: 5000)"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>권리금 (만원)</label>
                    <input
                      className={styles.input}
                      type="number"
                      value={jeonsePremium}
                      onChange={(e) => setJeonsePremium(e.target.value)}
                      placeholder="숫자만 입력 (없으면 0)"
                    />
                  </div>
                </>
              )}
              
              {/* --- 2-3. 조건부 입력칸 (월세) --- */}
              {isRent && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>월세 보증금 (만원)</label>
                    <input
                      className={styles.input}
                      type="number"
                      value={rentDeposit}
                      onChange={(e) => setRentDeposit(e.target.value)}
                      placeholder="숫자만 입력 (예: 1000)"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>월세 (만원)</label>
                    <input
                      className={styles.input}
                      type="number"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="숫자만 입력 (예: 100)"
                    />
                  </div>
                </>
              )}

              {/* --- 3. 매물 노트 --- */}
              <h3 className={styles.formSectionTitle}>매물 노트</h3>
               <div className={styles.formGroup}>
                <label className={styles.label}>키워드</label>
                <input
                  className={styles.input}
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="예: #역세권, #신축, #급매"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>상세 메모</label>
                <textarea
                  className={styles.textarea}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="매물에 대한 상세 정보를 입력하세요..."
                />
              </div>
              
              {/* --- ★ (추가) 사진 업로드 --- */}
              <h3 className={styles.formSectionTitle}>사진 등록 (최대 3개)</h3>
              <div className={styles.imageUploadContainer}>
                  {[0, 1, 2].map((index) => (
                      <div key={index} className={styles.imageSlot}>
                          {imageUrls[index] && imageUrls[index] !== 'remove' ? (
                              <div className={styles.imagePreviewWrapper}>
                                  <img 
                                      src={imageUrls[index].startsWith('blob:') ? imageUrls[index] : imageUrls[index] + `?t=${new Date().getTime()}`} 
                                      alt={`매물 사진 ${index + 1}`} 
                                      className={`${styles.imagePreviewThumbnail} ${styles.imagePreviewClickable}`} // ★ (수정) 클릭 가능 클래스
                                      onClick={() => setViewingImage(imageUrls[index])} // ★ (추가) 클릭 시 뷰어 열기
                                  />
                                  <button 
                                      type="button" 
                                      className={styles.imageRemoveButton}
                                      onClick={() => handleImageRemove(index)}
                                      disabled={isUploading}
                                  >
                                      X
                                  </button>
                              </div>
                          ) : (
                              <label className={styles.fileInputLabel}>
                                  +
                                  <input 
                                      type="file" 
                                      className={styles.fileInput}
                                      accept="image/*"
                                      onChange={(e) => handleImageChange(index, e.target.files[0])}
                                      disabled={isUploading}
                                  />
                              </label>
                          )}
                      </div>
                  ))}
              </div>
              
              {/* --- 5. 버튼 그룹 --- */}
              <div className={styles.buttonGroup}>
                  <button onClick={() => {
                      setSelectedPin(null);
                      clearTempMarkerAndMenu(); 
                  }} type="button" className={`${styles.button} ${styles.buttonGray}`}>
                      닫기
                  </button>
                  {selectedPin.id && (
                    <button onClick={() => handleDeletePin(selectedPin.id)} type="button" className={`${styles.button} ${styles.buttonRed}`} disabled={loading || isGenerating || isUploading}>
                        삭제
                    </button>
                  )}
                  <button type="submit" className={`${styles.button} ${styles.buttonBlue}`} disabled={loading || isGenerating || isUploading}>
                      {isUploading ? '저장 중...' : '저장'}
                  </button>
              </div>
              
              {/* --- 6. 추가 기능 버튼 (기존 핀) --- */}
              {selectedPin.id && (
                <>
                  <div className={styles.pdfButtonContainer}>
                      <button 
                          onClick={() => handleGenerateIm(selectedPin)} 
                          type="button" 
                          className={`${styles.button} ${styles.buttonPurple}`} 
                          disabled={isGenerating || loading || isUploading}
                      >
                          {isGenerating ? 'AI 입지 분석 중...' : 'AI 입지 분석 (정확도 UP)'}
                      </button>
                  </div>
                  {mode === 'tour' && (
                    <div className={styles.pdfButtonContainer}>
                        <button 
                            onClick={() => handleAddToTour(selectedPin)} 
                            type="button" 
                            className={`${styles.button} ${styles.buttonGreen}`} 
                            disabled={isGenerating || loading || isUploading}
                        >
                            🚩 임장 목록에 추가
                        </button>
                    </div>
                  )}
                </>
              )}
            </form>
            {/* --- ★ (수정) 폼 끝 ★ --- */}

            {/* --- 7. 고객 매칭 (기존 핀) --- */}
            {selectedPin.id && (
              <div className={styles.customerMatcher}>
                  <h3 className={styles.sidebarSubtitle}>고객 매칭</h3>
                  <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        const customerId = e.target.elements['customer-select'].value;
                        handleLinkCustomer(selectedPin.id, Number(customerId)); 
                    }}
                  >
                      <label className={styles.label}>고객 선택</label>
                      <select 
                        id="customer-select"
                        className={styles.input}
                        defaultValue=""
                      >
                          <option value="" disabled>-- 등록된 고객 --</option>
                          {customers.map(customer => (
                            <option key={customer.id} value={customer.id}>
                                {customer.name} ({customer.phone})
                            </option>
                          ))}
                      </select>
                      <button type="submit" className={`${styles.button} ${styles.buttonCyan}`} disabled={loading || isGenerating || isUploading}>
                          {loading ? '...' : '이 핀에 고객 연결'}
                      </button>
                  </form>
                  <div className={styles.linkedListContainer}>
                      <h4 className={styles.linkedListTitle}>연결된 고객 목록</h4>
                      {linkedCustomers.length === 0 && <p className={styles.emptyText}>연결된 고객이 없습니다.</p>}
                      <ul className={styles.linkedList}>
                          {linkedCustomers.map(link => (
                            <li key={link.id} className={styles.linkedListItem}>
                                <span>{link.customer ? link.customer.name : '삭제된 고객'}</span>
                                <button 
                                  onClick={() => handleUnlinkCustomer(link.id)}
                                  className={styles.unlinkButton}
                                  disabled={isGenerating || loading || isUploading}
                                >
                                    연결 해제
                                </button>
                            </li>
                          ))}
                      </ul>
                  </div>
              </div>
            )}
          </div>
        )}
        {!selectedPin && (
          <div className={styles.sidebarEmpty}>
            <p>지도를 우클릭하여 새 핀을 등록하세요.</p>
            {(loading || isGenerating) && <p>데이터 로딩 중...</p>}
          </div>
        )}
      </aside>
      
      {/* 3. 카카오 지도 (분리된 컴포넌트) */}
      <KakaoMap />
      
      {/* ★ (추가) 3-1. 커스텀 지도 컨트롤 (지도/스카이뷰/지적도) */}
      <div className={styles.mapControlContainer}>
        <button 
          className={`${styles.mapControlButton} ${mapType === 'NORMAL' ? styles.active : ''}`}
          onClick={() => setMapType('NORMAL')}
        >
          지도
        </button>
        <button 
          className={`${styles.mapControlButton} ${mapType === 'SKYVIEW' ? styles.active : ''}`}
          onClick={() => setMapType('SKYVIEW')}
        >
          스카이뷰
        </button>
        <button 
          className={`${styles.mapControlButton} ${showCadastral ? styles.active : ''}`}
          onClick={() => setShowCadastral(prev => !prev)} // Context의 핸들러 대신 직접 토글
        >
          지적도
        </button>
      </div>

      {/* 4. 입지 분석 모달 (★ 임시: 원래는 ImModal.jsx) */}
      {imContent && (
        <div className={styles.imModalOverlay}>
          <div className={styles.imModal}>
            <h2 className={styles.imModalTitle}>AI 생성 입지 분석 (실데이터 기반)</h2>
            <div className={styles.imContentScroll}>
              <pre className={styles.imContentPre}>{imContent}</pre>
            </div>
            <button 
              onClick={() => setImContent(null)} 
              className={`${styles.button} ${styles.buttonRed}`}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 5. 'div' 기반 컨텍스트 메뉴 (★ 임시: 원래는 MapContextMenu.jsx) */}
      {contextMenu.visible && (
        <div 
          ref={contextMenuRef} 
          className={styles.contextMenu}
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${(mapRef.current ? mapRef.current.parentElement.offsetLeft : 0) + contextMenu.x}px`
          }}
        >
          <button onClick={() => handleContextMenuAction('createPin')}>
            임장 등록 (핀 생성)
          </button>
          <button disabled>예시 2 (준비중)</button>
          <button disabled>예시 3 (준비중)</button>
          <button disabled>예시 4 (준비중)</button>
        </div>
      )}

      {/* ★ (추가) 6. 사진 뷰어 모달 */}
      {viewingImage && (
        <div 
          className={styles.imModalOverlay} // 기존 모달 오버레이 스타일 재사용
          onClick={() => setViewingImage(null)} // ★ 배경 클릭 시 닫기
        >
          <div 
            className={styles.imageViewerModal} // ★ 새 스타일
            onClick={(e) => e.stopPropagation()} // ★ 이미지 클릭 시 닫히는 것 방지
          >
            <img 
              src={viewingImage.startsWith('blob:') ? viewingImage : viewingImage + `?t=${new Date().getTime()}`} 
              alt="매물 사진 크게 보기" 
            />
            <button 
              onClick={() => setViewingImage(null)}
              className={styles.imageViewerCloseButton} // ★ 새 스타일
            >
              X
            </button>
          </div>
        </div>
      )}

    </div>
  );
}