import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { supabase } from '../../../../0005_Lib/supabaseClient';
import { propertyService } from '../../../../services/propertyService';

export default function StackForm() {
  const { stackParentPin, closeStackMode, fetchPins, isEditMode } = useMap();
  const [loading, setLoading] = useState(false);
  const [newFiles, setNewFiles] = useState([]);

  const [formData, setFormData] = useState({
    status: '거래전', propertyType: '아파트', stackTitle: '', buildingName: '', detailedAddress: '',
    isSale: false, isJeonse: false, isRent: false,
    salePrice: '', jeonseDeposit: '', rentDeposit: '', rentAmount: '',
    keyMoney: '', maintenanceFee: '', area: '', floor: '', keywords: '', notes: '',
    imageUrls: []
  });

  useEffect(() => {
    if (stackParentPin) {
      setFormData(prev => ({
        ...prev,
        propertyType: stackParentPin.property_type || '아파트',
        buildingName: stackParentPin.building_name || '',
        stackTitle: stackParentPin.title || stackParentPin.building_name || '동일 위치 매물',
      }));
    }
  }, [stackParentPin]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // 사진 업로드 및 제거 핸들러
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (formData.imageUrls.length + newFiles.length + files.length > 20) return alert("최대 20장까지 가능합니다.");
    setNewFiles(prev => [...prev, ...files]);
  };

  const handleRemoveImage = (index, isNew) => {
    if (isNew) setNewFiles(prev => prev.filter((_, i) => i !== index));
    else setFormData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== index) }));
  };

  const handleUpdateTitleOnly = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('pins').update({ title: formData.stackTitle }).match({ lat: stackParentPin.lat, lng: stackParentPin.lng });
      if (error) throw error;
      alert('스택 제목이 수정되었습니다.');
      await fetchPins(); closeStackMode();
    } catch (error) { alert('수정 실패: ' + error.message); }
  };

  const handleSubmitAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 사진 업로드 처리
      const uploadedUrls = [];
      for (const file of newFiles) {
        const url = await propertyService.uploadPropertyImage(file);
        uploadedUrls.push(url);
      }

      const payload = {
        user_id: user.id, lat: stackParentPin.lat, lng: stackParentPin.lng, address: stackParentPin.address,
        status: formData.status, property_type: formData.propertyType, title: formData.stackTitle,
        building_name: formData.buildingName, detailed_address: formData.detailedAddress,
        is_sale: formData.isSale, is_jeonse: formData.isJeonse, is_rent: formData.isRent,
        sale_price: Number(formData.salePrice) || null, jeonse_deposit: Number(formData.jeonseDeposit) || null,
        rent_deposit: Number(formData.rentDeposit) || null, rent_amount: Number(formData.rentAmount) || null,
        key_money: Number(formData.keyMoney) || 0, area: formData.area, floor: formData.floor, 
        notes: formData.notes, keywords: formData.keywords, image_urls: uploadedUrls
      };

      const { error } = await supabase.from('pins').insert(payload);
      if (error) throw error;
      alert('스택 매물이 추가되었습니다.');
      await fetchPins(); closeStackMode();
    } catch (error) { alert('등록 에러: ' + error.message); } finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', marginTop: '12px' };
  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' };
  const btnStyle = (isSelected) => ({
    flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db',
    backgroundColor: isSelected ? '#2563eb' : 'white', color: isSelected ? 'white' : '#4b5563',
    fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px'
  });

  if (isEditMode) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>스택 제목 수정</h2>
          <button onClick={closeStackMode} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <form onSubmit={handleUpdateTitleOnly}>
          <label style={labelStyle}>📌 스택 그룹 제목</label>
          <input name="stackTitle" value={formData.stackTitle} onChange={handleChange} style={{ ...inputStyle, border: '2px solid #2563eb' }} required />
          <button type="submit" style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>제목 저장</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', paddingBottom: '150px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>스택 매물 추가</h2>
        <button onClick={closeStackMode} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
      </div>
      <form onSubmit={handleSubmitAll}>
        <label style={labelStyle}>📌 스택 그룹 제목</label>
        <input name="stackTitle" value={formData.stackTitle} onChange={handleChange} style={inputStyle} required />

        <label style={labelStyle}>거래 상태</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['거래전', '거래중', '거래완료'].map(s => (
            <button key={s} type="button" style={btnStyle(formData.status === s)} onClick={() => setFormData(prev => ({...prev, status: s}))}>{s}</button>
          ))}
        </div>

        <label style={labelStyle}>매물 유형</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {['아파트', '오피스텔', '빌라', '상가', '사무실', '토지'].map(type => (
            <button key={type} type="button" style={btnStyle(formData.propertyType === type)} onClick={() => setFormData(prev => ({...prev, propertyType: type}))}>{type}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>건물명</label><input name="buildingName" value={formData.buildingName} onChange={handleChange} style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>동/호수</label><input name="detailedAddress" value={formData.detailedAddress} onChange={handleChange} style={inputStyle} required /></div>
        </div>

        <h3 style={{ fontSize: '1rem', borderBottom: '1px solid #eee', paddingBottom: '5px', marginTop: '30px' }}>거래 및 가격 정보</h3>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {['isSale', 'isJeonse', 'isRent'].map(f => (
            <label key={f} style={{ flex: 1, textAlign: 'center', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', backgroundColor: formData[f] ? '#eff6ff' : 'white', fontSize: '12px' }}>
              <input type="checkbox" name={f} checked={formData[f]} onChange={handleChange} style={{ display: 'none' }} /> {f === 'isSale' ? '매매' : f === 'isJeonse' ? '전세' : '월세'}
            </label>
          ))}
        </div>

        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {formData.isSale && <input type="number" name="salePrice" placeholder="매매가 (만원)" onChange={handleChange} style={inputStyle} />}
          {formData.isJeonse && <input type="number" name="jeonseDeposit" placeholder="전세금 (만원)" onChange={handleChange} style={inputStyle} />}
          {formData.isRent && <div style={{ display: 'flex', gap: '8px' }}><input type="number" name="rentDeposit" placeholder="보증금" onChange={handleChange} style={inputStyle} /><input type="number" name="rentAmount" placeholder="월세" onChange={handleChange} style={inputStyle} /></div>}
        </div>

        <label style={labelStyle}>키워드 / 상세설명</label>
        <input name="keywords" value={formData.keywords} onChange={handleChange} style={inputStyle} placeholder="키워드 입력" />
        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, height: 'auto', marginTop: '8px' }} placeholder="상세 메모" />

        <label style={labelStyle}>사진 등록</label>
        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ fontSize: '12px' }} />
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px' }}>
          {newFiles.map((file, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
              <button type="button" onClick={() => handleRemoveImage(i, true)} style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '10px' }}>×</button>
            </div>
          ))}
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? '등록 중...' : '스택 등록 완료'}
        </button>
      </form>
    </div>
  );
}