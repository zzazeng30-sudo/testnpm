import React from 'react';
// ▼ 여기가 수정되었습니다 (점 4개!)
import { useMap } from '../../../../contexts/MapContext';
import styles from '../../pages/MapPage.module.css';

export default function PinForm() {
  const {
    selectedPin, setSelectedPin, clearTempMarkerAndMenu,
    handleSidebarSave, handleDeletePin, setIsEditMode,
    loading, isGenerating, isUploading,
    
    // 폼 상태
    propertyType, setPropertyType, propertyTypeEtc, setPropertyTypeEtc,
    address, setAddress, detailedAddress, setDetailedAddress, buildingName, setBuildingName,
    status, setStatus,
    isSale, setIsSale, salePrice, setSalePrice,
    isJeonse, setIsJeonse, jeonseDeposit, setJeonseDeposit, jeonsePremium, setJeonsePremium,
    isRent, setIsRent, rentDeposit, setRentDeposit, rentAmount, setRentAmount,
    keywords, setKeywords, notes, setNotes,
    imageUrls, handleImageChange, handleImageRemove, setViewingImage,
    validationErrors
  } = useMap();

  return (
    <form key={selectedPin.id || 'new-pin'} onSubmit={handleSidebarSave}>
      <h2 className={styles.sidebarTitle}>
        {selectedPin.id ? '매물 정보 수정' : '새 매물 등록'}
      </h2>

      <h3 className={styles.formSectionTitle}>소재 정보</h3>
      <div className={styles.formRow}>
         <div className={`${styles.formGroup} ${propertyType === '기타' ? styles.formGroupHalf : styles.formGroupFull}`}>
            <label className={styles.label}>매물 유형 <span className={styles.requiredText}>(필수)</span></label>
            <select className={styles.input} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
               <option value="">-- 유형 선택 --</option>
               <option value="주택">주택</option>
               <option value="상가">상가</option>
               <option value="토지">토지</option>
               <option value="아파트">아파트</option>
               <option value="기타">기타</option>
            </select>
         </div>
         {propertyType === '기타' && (
            <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
              <label className={styles.label}>기타 유형</label>
              <select className={styles.input} value={propertyTypeEtc} onChange={(e) => setPropertyTypeEtc(e.target.value)}>
                <option value="">-- 선택 --</option>
                {[...Array(10)].map((_, i) => <option key={i} value={`기타${i+1}`}>{`기타${i+1}`}</option>)}
              </select>
            </div>
         )}
      </div>
      
      <div className={styles.formGroup}>
        <label className={styles.label}>주소 (자동)</label>
        <input className={styles.input} type="text" value={address} onChange={(e) => setAddress(e.target.value)} readOnly />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>상세 주소</label>
        <input className={styles.input} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)} placeholder="101동 101호" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>건물명</label>
        <input className={styles.input} type="text" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="현대아파트" />
      </div>

      <h3 className={styles.formSectionTitle}>거래 정보</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>거래 상태</label>
        <select className={styles.input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="거래전">거래전</option>
          <option value="거래중">거래중</option>
          <option value="거래완료">거래완료</option>
        </select>
      </div>

      <div className={styles.formGroup}>
         <label className={styles.label}>거래 유형 (중복 가능) <span className={styles.requiredText}>(필수)</span></label>
         <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}><input type="checkbox" className={styles.checkboxInput} checked={isSale} onChange={(e) => setIsSale(e.target.checked)} /> 매매</label>
            <label className={styles.checkboxLabel}><input type="checkbox" className={styles.checkboxInput} checked={isJeonse} onChange={(e) => setIsJeonse(e.target.checked)} /> 전세</label>
            <label className={styles.checkboxLabel}><input type="checkbox" className={styles.checkboxInput} checked={isRent} onChange={(e) => setIsRent(e.target.checked)} /> 월세</label>
         </div>
      </div>

      {isSale && (
        <div className={styles.formGroup}>
          <label className={styles.label}>매매 금액 (만원)</label>
          <input className={styles.input} type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="숫자만 입력" />
        </div>
      )}
      {isJeonse && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>전세 보증금 (만원)</label>
            <input className={styles.input} type="number" value={jeonseDeposit} onChange={(e) => setJeonseDeposit(e.target.value)} placeholder="숫자만 입력" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>권리금 (만원)</label>
            <input className={styles.input} type="number" value={jeonsePremium} onChange={(e) => setJeonsePremium(e.target.value)} placeholder="0" />
          </div>
        </>
      )}
      {isRent && (
        <>
          <div className={styles.formGroup}>
            <label className={styles.label}>월세 보증금 (만원)</label>
            <input className={styles.input} type="number" value={rentDeposit} onChange={(e) => setRentDeposit(e.target.value)} placeholder="숫자만 입력" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>월세 (만원)</label>
            <input className={styles.input} type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="숫자만 입력" />
          </div>
        </>
      )}

      <h3 className={styles.formSectionTitle}>매물 노트</h3>
      <div className={styles.formGroup}>
        <label className={styles.label}>키워드 <span className={styles.requiredText}>(필수)</span></label>
        <input className={styles.input} type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="#역세권, #신축" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label}>상세 메모</label>
        <textarea className={styles.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="상세 정보..." />
      </div>

      <h3 className={styles.formSectionTitle}>사진 등록</h3>
      <div className={styles.imageUploadContainer}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.imageSlot}>
            {imageUrls[index] && imageUrls[index] !== 'remove' ? (
              <div className={styles.imagePreviewWrapper}>
                <img 
                    src={imageUrls[index].startsWith('blob:') ? imageUrls[index] : imageUrls[index]} 
                    alt={`사진${index}`} 
                    className={`${styles.imagePreviewThumbnail} ${styles.imagePreviewClickable}`} 
                    onClick={() => setViewingImage(imageUrls[index])}
                />
                <button type="button" className={styles.imageRemoveButton} onClick={() => handleImageRemove(index)}>X</button>
              </div>
            ) : (
              <label className={styles.fileInputLabel}> + <input type="file" className={styles.fileInput} accept="image/*" onChange={(e) => handleImageChange(index, e.target.files[0])} disabled={isUploading} /></label>
            )}
          </div>
        ))}
      </div>

      {validationErrors.length > 0 && (
        <div className={styles.validationErrorContainer}>
           <p className={styles.validationErrorTitle}>필수 항목 누락:</p>
           <ul className={styles.validationErrorList}>{validationErrors.map(err => <li key={err}>{err}</li>)}</ul>
        </div>
      )}

      <div className={styles.buttonGroup}>
        <button onClick={() => { 
            if (selectedPin.id) setIsEditMode(false); 
            else { setSelectedPin(null); clearTempMarkerAndMenu(); }
        }} type="button" className={`${styles.button} ${styles.buttonGray}`}>
          취소
        </button>
        {selectedPin.id && (
          <button onClick={() => handleDeletePin(selectedPin.id)} type="button" className={`${styles.button} ${styles.buttonRed}`} disabled={loading}>
            삭제
          </button>
        )}
        <button type="submit" className={`${styles.button} ${styles.buttonBlue}`} disabled={loading || isUploading}>
          {isUploading ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}