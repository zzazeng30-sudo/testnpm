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

/* ★ 21일차 (수정): mapRef를 '뇌'에서 받아옴 */
function MapPageContent() {
  const {
    // PinSidebar용 state
    selectedPin, setSelectedPin, editMemo, setEditMemo, editPrice, setEditPrice,
    loading, isGenerating, session, mode,
    customers, linkedCustomers,
    // PinSidebar용 handlers
    handleSidebarSave, handleDeletePin, handleGenerateIm, handleAddToTour,
    handleLinkCustomer, handleUnlinkCustomer, clearTempMarkerAndMenu,
    // ImModal용
    imContent, setImContent,
    // MapContextMenu용
    contextMenu, contextMenuRef, handleContextMenuAction,
    // KakaoMap용
    mapRef // ★ 21일차 (수정): '뇌'에서 mapRef 가져오기
  } = useMap();

  return (
    <div className={styles.pageContainerMap}>
      
      {/* 1. 왼쪽 패널 (분리된 컴포넌트) */}
      <LeftPanel />
      
      {/* 2. 매물 정보 사이드바 (★ 임시: 원래는 PinSidebar.jsx) */}
      <aside 
        className={`${styles.sidebar} ${selectedPin ? styles.sidebarOpen : styles.sidebarClosed}`}
      >
        {selectedPin && (
          <div className={styles.sidebarContent}>
            <form key={selectedPin.id || 'new-pin'} onSubmit={handleSidebarSave}>
              <h2 className={styles.sidebarTitle}>
                {selectedPin.id ? '매물 정보 수정' : '새 매물 등록'}
              </h2>
              <div className={styles.formGroup}>
                <label className={styles.label}>메모</label>
                <textarea
                  className={styles.textarea}
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  placeholder="매물에 대한 상세 정보를 입력하세요..."
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>가격 (만원)</label>
                <input
                  className={styles.input}
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(Number(e.target.value))}
                  placeholder="숫자만 입력 (단위: 만원)"
                />
              </div>
              
              {selectedPin.id ? (
                <p className={styles.metaText}>ID: {selectedPin.id}</p>
              ) : (
                 <p className={styles.metaText}>
                   좌표: {selectedPin.lat.toFixed(4)}, {selectedPin.lng.toFixed(4)}
                 </p>
              )}
              
              <div className={styles.buttonGroup}>
                  <button onClick={() => {
                      setSelectedPin(null);
                      clearTempMarkerAndMenu(); 
                  }} type="button" className={`${styles.button} ${styles.buttonGray}`}>
                      닫기
                  </button>
                  {selectedPin.id && (
                    <button onClick={() => handleDeletePin(selectedPin.id)} type="button" className={`${styles.button} ${styles.buttonRed}`} disabled={loading || isGenerating}>
                        삭제
                    </button>
                  )}
                  <button type="submit" className={`${styles.button} ${styles.buttonBlue}`} disabled={loading || isGenerating}>
                      {loading ? '...' : '저장'}
                  </button>
              </div>
              
              {selectedPin.id && (
                <>
                  <div className={styles.pdfButtonContainer}>
                      <button 
                          onClick={() => handleGenerateIm(selectedPin)} 
                          type="button" 
                          className={`${styles.button} ${styles.buttonPurple}`} 
                          disabled={isGenerating || loading}
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
                            disabled={isGenerating || loading}
                        >
                            🚩 임장 목록에 추가
                        </button>
                    </div>
                  )}
                </>
              )}
            </form>
            
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
                      <button type="submit" className={`${styles.button} ${styles.buttonCyan}`} disabled={loading || isGenerating}>
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
                                  disabled={isGenerating || loading}
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
          // ★ 21일차 (수정): '뇌'에서 받은 mapRef로 위치 계산
          style={{ 
            top: `${contextMenu.y}px`, 
            left: `${(mapRef.current ? mapRef.current.offsetLeft : 0) + contextMenu.x}px`
          }}
        >
          <button onClick={() => handleContextMenuAction('createPin')}>
            📍 임장 등록 (핀 생성)
          </button>
          <button disabled>예시 2 (준비중)</button>
          <button disabled>예시 3 (준비중)</button>
          <button disabled>예시 4 (준비중)</button>
        </div>
      )}

    </div>
  );
}