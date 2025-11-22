import React from 'react';
// ▼ 여기가 수정되었습니다 (점 4개!)
import { useMap } from '../../../../contexts/MapContext';
import styles from '../../../../MapPage.module.css';

// 가격 포맷 헬퍼
const formatPrice = (pin) => {
  const formatNum = (val) => Number(val || 0).toLocaleString();
  const prices = [];
  if (pin.is_sale && pin.sale_price) prices.push(`매매 ${formatNum(pin.sale_price)}`);
  if (pin.is_jeonse) {
    let str = `전세 ${formatNum(pin.jeonse_deposit)}`;
    if (pin.jeonse_premium > 0) str += ` (권 ${formatNum(pin.jeonse_premium)})`;
    prices.push(str);
  }
  if (pin.is_rent) prices.push(`월세 ${formatNum(pin.rent_deposit)} / ${formatNum(pin.rent_amount)}`);
  return prices.length === 0 ? "가격 정보 없음" : prices.join(' | '); 
};

export default function PinDetail() {
  const {
    selectedPin, setSelectedPin, clearTempMarkerAndMenu,
    setIsEditMode, imageUrls, setViewingImage,
    handleGenerateIm, handleAddToTour, isGenerating, loading, mode,
    customers, linkedCustomers, handleLinkCustomer, handleUnlinkCustomer
  } = useMap();

  if (!selectedPin) return null;

  return (
    <div className={styles.readOnlyContainer}>
      <h2 className={styles.readOnlyTitle}>원장 상세</h2>
      
      <h3 className={styles.readOnlyPrice}>{formatPrice(selectedPin)}</h3>
      <p className={styles.readOnlyAddress}>
        {selectedPin.address || '주소 없음'} {selectedPin.detailed_address || ''}
      </p>

      <div className={styles.readOnlyTable}>
         <div className={styles.readOnlyRow}>
            <span className={styles.readOnlyLabel}>물건유형</span>
            <span className={styles.readOnlyValue}>
              {selectedPin.property_type || '-'}
              {selectedPin.property_type_etc ? ` (${selectedPin.property_type_etc})` : ''}
            </span>
         </div>
         <div className={styles.readOnlyRow}>
            <span className={styles.readOnlyLabel}>건물명</span>
            <span className={styles.readOnlyValue}>{selectedPin.building_name || '-'}</span>
         </div>
         <div className={styles.readOnlyRow}>
            <span className={styles.readOnlyLabel}>거래상태</span>
            <span className={styles.readOnlyValue}>{selectedPin.status || '-'}</span>
         </div>
         <div className={styles.readOnlyRow}>
            <span className={styles.readOnlyLabel}>키워드</span>
            <span className={styles.readOnlyValue}>{selectedPin.keywords || '-'}</span>
         </div>
         <div className={styles.readOnlyRow}>
            <span className={styles.readOnlyLabel}>상세메모</span>
            <span className={styles.readOnlyValue} style={{whiteSpace: 'pre-wrap'}}>
              {selectedPin.notes || '-'}
            </span>
         </div>
      </div>

      {/* 사진 정보 */}
      <h3 className={styles.formSectionTitle}>사진</h3>
      <div className={styles.imageUploadContainer}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.imageSlot}>
             {imageUrls[index] && imageUrls[index] !== 'remove' ? (
                <div className={styles.imagePreviewWrapper}>
                  <img 
                    src={imageUrls[index].startsWith('blob:') ? imageUrls[index] : imageUrls[index]} 
                    alt={`사진 ${index + 1}`}
                    className={`${styles.imagePreviewThumbnail} ${styles.imagePreviewClickable}`}
                    onClick={() => setViewingImage(imageUrls[index])} 
                  />
                </div>
             ) : <div className={styles.imageSlotEmpty}>-</div>}
          </div>
        ))}
      </div>

      {/* 기능 버튼 */}
      <div className={styles.buttonGroupVertical}>
         <button onClick={() => handleGenerateIm(selectedPin)} className={`${styles.button} ${styles.buttonPurple}`} disabled={isGenerating || loading}>
           {isGenerating ? 'AI 입지 분석 중...' : 'AI 입지 분석 (정확도 UP)'}
         </button>
         {mode === 'tour' && (
           <button onClick={() => handleAddToTour(selectedPin)} className={`${styles.button} ${styles.buttonGreen}`} disabled={isGenerating || loading}>
             🚩 임장 목록에 추가
           </button>
         )}
      </div>

      {/* 고객 매칭 */}
      {selectedPin.id && (
        <div className={styles.customerMatcher}>
           <h3 className={styles.sidebarSubtitle}>고객 매칭</h3>
           <form onSubmit={(e) => {
              e.preventDefault();
              const customerId = e.target.elements['customer-select'].value;
              handleLinkCustomer(selectedPin.id, Number(customerId));
           }}>
             <label className={styles.label}>고객 선택</label>
             <select id="customer-select" className={styles.input} defaultValue="">
               <option value="" disabled>-- 등록된 고객 --</option>
               {customers.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
             </select>
             <button type="submit" className={`${styles.button} ${styles.buttonCyan}`} disabled={loading}>이 핀에 고객 연결</button>
           </form>
           
           <div className={styles.linkedListContainer}>
              <h4 className={styles.linkedListTitle}>연결된 고객 목록</h4>
              {linkedCustomers.length === 0 && <p className={styles.emptyText}>연결된 고객이 없습니다.</p>}
              <ul className={styles.linkedList}>
                {linkedCustomers.map(link => (
                  <li key={link.id} className={styles.linkedListItem}>
                    <span>{link.customer ? link.customer.name : '삭제된 고객'}</span>
                    <button onClick={() => handleUnlinkCustomer(link.id)} className={styles.unlinkButton} disabled={loading}>해제</button>
                  </li>
                ))}
              </ul>
           </div>
        </div>
      )}

      {/* 하단 버튼 */}
      <div className={`${styles.buttonGroup} ${styles.readOnlyBottomButtons}`}>
        <button onClick={() => { setSelectedPin(null); clearTempMarkerAndMenu(); }} className={`${styles.button} ${styles.buttonGray}`}>
          매물 닫기
        </button>
        <button onClick={() => setIsEditMode(true)} className={`${styles.button} ${styles.buttonBlue}`}>
          매물 수정
        </button>
      </div>
    </div>
  );
}