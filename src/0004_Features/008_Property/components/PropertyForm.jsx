/**
 * [Revision Info]
 * Rev: 1.0
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Improvements]
 * 1. 복잡한 입력 폼을 별도 컴포넌트로 분리하여 메인 페이지 가독성 확보
 * 2. 카카오 주소 검색 로직(Geocoding) 내장
 */

import React, { useState } from 'react';
import styles from '../PropertyPage.module.css'; // 상위 폴더의 CSS 참조

const PropertyForm = ({ onAddProperty, session, loading }) => {
  // Local State for Form
  const [form, setForm] = useState({
    address: '', detailedAddress: '', buildingName: '',
    propertyType: '', propertyTypeEtc: '',
    isSale: false, salePrice: '',
    isJeonse: false, jeonseDeposit: '', jeonsePremium: '',
    isRent: false, rentDeposit: '', rentAmount: '',
    keywords: '', notes: ''
  });
  const [coords, setCoords] = useState(null);

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Geocoding Logic
  const handleGeocode = () => {
    if (!form.address) return alert('주소를 입력하세요.');
    if (!window.kakao || !window.kakao.maps.services) return alert('지도 API 로드 실패');

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(form.address, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const newCoords = { lat: result[0].y, lng: result[0].x };
        setCoords(newCoords);
        alert(`좌표 변환 성공: [${newCoords.lat}, ${newCoords.lng}]`);
      } else {
        alert('주소를 찾을 수 없습니다.');
        setCoords(null);
      }
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coords) return alert('좌표 변환이 필요합니다.');

    const parseNum = (val) => (val === '' || val === undefined ? null : Number(val));

    const newPropertyData = {
      address: form.address,
      detailed_address: form.detailedAddress,
      building_name: form.buildingName,
      property_type: form.propertyType,
      property_type_etc: form.propertyType === '기타' ? form.propertyTypeEtc : '',
      is_sale: form.isSale,
      sale_price: parseNum(form.salePrice),
      is_jeonse: form.isJeonse,
      jeonse_deposit: parseNum(form.jeonseDeposit),
      jeonse_premium: parseNum(form.jeonsePremium),
      is_rent: form.isRent,
      rent_deposit: parseNum(form.rentDeposit),
      rent_amount: parseNum(form.rentAmount),
      keywords: form.keywords,
      notes: form.notes,
      status: '거래전',
      image_urls: ['', '', ''],
      lat: coords.lat,
      lng: coords.lng,
      user_id: session.user.id,
    };

    const result = await onAddProperty(newPropertyData);
    if (result.success) {
      // Reset Form
      setForm({
        address: '', detailedAddress: '', buildingName: '',
        propertyType: '', propertyTypeEtc: '',
        isSale: false, salePrice: '',
        isJeonse: false, jeonseDeposit: '', jeonsePremium: '',
        isRent: false, rentDeposit: '', rentAmount: '',
        keywords: '', notes: ''
      });
      setCoords(null);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.sidebarTitle}>새 매물 등록</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        {/* 기본 정보 */}
        <div className={styles.formRow}>
          <div className={styles.formGroupFull}>
            <label className={styles.label}>매물 유형</label>
            <select name="propertyType" className={styles.input} value={form.propertyType} onChange={handleChange}>
              <option value="">-- 선택 --</option>
              <option value="아파트">아파트</option>
              <option value="주택">주택</option>
              <option value="상가">상가</option>
              <option value="토지">토지</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>

        {/* 주소 및 좌표 */}
        <div>
          <label className={styles.label}>주소</label>
          <div className={styles.addressGroup}>
            <input name="address" className={styles.input} type="text" value={form.address} onChange={handleChange} placeholder="주소 입력" />
            <button type="button" onClick={handleGeocode} className={styles.geocodeButton} disabled={loading}>변환</button>
          </div>
          {coords && <p className={styles.coordsText}>✓ 좌표 확인됨</p>}
        </div>
        
        <input name="detailedAddress" className={styles.input} type="text" value={form.detailedAddress} onChange={handleChange} placeholder="상세주소 (호수)" />
        <input name="buildingName" className={styles.input} type="text" value={form.buildingName} onChange={handleChange} placeholder="건물명" />

        {/* 거래 유형 및 가격 */}
        <label className={styles.label}>거래 유형 & 가격(만원)</label>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="isSale" checked={form.isSale} onChange={handleChange} /> 매매
          </label>
        </div>
        {form.isSale && <input name="salePrice" className={styles.input} type="number" value={form.salePrice} onChange={handleChange} placeholder="매매가" />}

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="isJeonse" checked={form.isJeonse} onChange={handleChange} /> 전세
          </label>
        </div>
        {form.isJeonse && (
          <div className="flex gap-1">
            <input name="jeonseDeposit" className={styles.input} type="number" value={form.jeonseDeposit} onChange={handleChange} placeholder="보증금" />
            <input name="jeonsePremium" className={styles.input} type="number" value={form.jeonsePremium} onChange={handleChange} placeholder="권리금" />
          </div>
        )}

        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="isRent" checked={form.isRent} onChange={handleChange} /> 월세
          </label>
        </div>
        {form.isRent && (
          <div className="flex gap-1">
            <input name="rentDeposit" className={styles.input} type="number" value={form.rentDeposit} onChange={handleChange} placeholder="보증금" />
            <input name="rentAmount" className={styles.input} type="number" value={form.rentAmount} onChange={handleChange} placeholder="월세" />
          </div>
        )}

        <textarea name="notes" className={styles.textarea} value={form.notes} onChange={handleChange} placeholder="상세 메모..." />
        
        <button type="submit" className={styles.button} disabled={loading || !coords}>
          {loading ? '등록 중...' : '매물 등록'}
        </button>
      </form>
    </aside>
  );
};

export default PropertyForm;