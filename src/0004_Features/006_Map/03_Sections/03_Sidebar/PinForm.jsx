import React, { useState, useEffect } from 'react';
import { useMap } from '../../02_Contexts/MapContext';
import { propertyService } from '../../../../services/propertyService'; 
import { authService } from '../../../../services/authService';

const PinForm = ({ mode }) => {
  const { 
    selectedPin, resetSelection, fetchPins, 
    // 기존 form 훅 대신 내부 state 사용 (구조 변경을 위해)
    resetForm 
  } = useMap(); 
  
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(false);
  const [newFiles, setNewFiles] = useState([]);

  // ★ 폼 상태 정의 (중복 선택 지원을 위해 내부 상태로 관리)
  const [form, setForm] = useState({
    status: '거래전',
    property_type: '아파트',
    building_name: '',
    address: '',
    detailed_address: '',
    
    // 거래 유형 (중복 선택 가능)
    is_sale: false,
    is_jeonse: false,
    is_rent: false,

    // 가격 정보 (독립적으로 관리)
    sale_price: '',
    jeonse_deposit: '',
    rent_deposit: '',
    rent_amount: '',
    key_money: '',
    
    maintenance_fee: '',
    area: '',
    floor: '',
    room_count: '',
    bathroom_count: '',
    keywords: '',
    notes: '',
    image_urls: []
  });

  // 데이터 불러오기 (수정 모드 또는 초기화)
  useEffect(() => {
    if (selectedPin) {
      if (isEdit) {
        setForm({
          status: selectedPin.status || '거래전',
          property_type: selectedPin.property_type || '아파트',
          building_name: selectedPin.building_name || '',
          address: selectedPin.address || '',
          detailed_address: selectedPin.detailed_address || '',
          
          is_sale: selectedPin.is_sale || false,
          is_jeonse: selectedPin.is_jeonse || false,
          is_rent: selectedPin.is_rent || false,

          sale_price: selectedPin.sale_price || '',
          jeonse_deposit: selectedPin.jeonse_deposit || '',
          rent_deposit: selectedPin.rent_deposit || '',
          rent_amount: selectedPin.rent_amount || '',
          key_money: selectedPin.key_money || '',
          maintenance_fee: selectedPin.maintenance_fee || '',

          area: selectedPin.area || '',
          floor: selectedPin.floor || '',
          room_count: selectedPin.room_count || '',
          bathroom_count: selectedPin.bathroom_count || '',
          keywords: selectedPin.keywords || '',
          notes: selectedPin.notes || '',
          image_urls: selectedPin.image_urls || []
        });
        setNewFiles([]);
      } else {
        // 등록 모드: 주소 좌표 변환만 수행하고 나머지는 초기값
        if (!selectedPin.address && window.kakao && window.kakao.maps.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(selectedPin.lng, selectedPin.lat, (result, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
              setForm(prev => ({ ...prev, address: addr }));
            }
          });
        } else {
          setForm(prev => ({ ...prev, address: selectedPin.address || '' }));
        }
        setNewFiles([]);
      }
    }
  }, [selectedPin, isEdit]);

  // 입력 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // 단일 선택 핸들러 (상태, 매물유형 등)
  const handleTypeSelect = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ★ 거래 유형 토글 핸들러 (중복 선택 지원)
  const toggleTransactionType = (typeField) => {
    setForm(prev => ({
      ...prev,
      [typeField]: !prev[typeField]
    }));
  };

  // 이미지 압축 (기존 로직 유지)
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280; 
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: "image/webp", lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else { resolve(file); }
          }, 'image/webp', 0.7);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const currentCount = (form.image_urls ? form.image_urls.length : 0) + newFiles.length;
    if (currentCount + files.length > 20) return alert("사진은 최대 20장까지 등록 가능합니다.");
    setLoading(true);
    const compressedFiles = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        compressedFiles.push(compressed);
      }
    }
    setNewFiles(prev => [...prev, ...compressedFiles]);
    setLoading(false);
    e.target.value = ''; 
  };

  const handleRemoveImage = (index, isNew) => {
    if (isNew) setNewFiles(prev => prev.filter((_, i) => i !== index));
    else setForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPin) return;
    
    // 유효성 검사
    if (!form.is_sale && !form.is_jeonse && !form.is_rent) {
      return alert("최소 1개 이상의 거래 유형(매매/전세/월세)을 선택해주세요.");
    }

    setLoading(true);
    try {
      const { session } = await authService.getSession();
      if (!session) throw new Error("세션 만료");

      const uploadedUrls = [];
      if (newFiles.length > 0) {
        for (const file of newFiles) {
          const url = await propertyService.uploadPropertyImage(file);
          uploadedUrls.push(url);
        }
      }

      const finalImageUrls = [...(form.image_urls || []), ...uploadedUrls];

      const payload = {
        user_id: session.user.id,
        lat: selectedPin.lat, lng: selectedPin.lng,
        address: form.address, detailed_address: form.detailed_address,
        building_name: form.building_name, property_type: form.property_type,
        keywords: form.keywords,
        
        // 중복 선택된 유형 저장
        is_sale: form.is_sale,
        is_jeonse: form.is_jeonse,
        is_rent: form.is_rent,
        
        // 각 유형별 가격 저장 (꺼져있으면 0이나 null 처리 가능하지만, 데이터 보존 위해 값 있으면 저장 권장)
        sale_price: form.is_sale ? (Number(form.sale_price) || 0) : null,
        jeonse_deposit: form.is_jeonse ? (Number(form.jeonse_deposit) || 0) : null,
        rent_deposit: form.is_rent ? (Number(form.rent_deposit) || 0) : null,
        rent_amount: form.is_rent ? (Number(form.rent_amount) || 0) : null,
        key_money: Number(form.key_money) || 0,
        
        area: form.area,
        maintenance_fee: Number(form.maintenance_fee) || 0, 
        floor: form.floor,
        room_count: Number(form.room_count) || 0, 
        bathroom_count: Number(form.bathroom_count) || 0,
        notes: form.notes,
        status: form.status,
        image_urls: finalImageUrls 
      };

      if (isEdit) {
        await propertyService.updateProperty(selectedPin.id, payload);
        alert("수정되었습니다.");
      } else {
        await propertyService.createProperty(payload);
        alert("등록되었습니다.");
      }
      await fetchPins(); 
      resetSelection(); 
    } catch (err) { alert("오류: " + err.message); } finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', marginTop: '12px' };
  const inputStyle = { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px' };
  
  // 버튼 스타일 (단일 선택용)
  const btnStyle = (isSelected, activeColor = '#2563eb') => ({
    flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db',
    backgroundColor: isSelected ? activeColor : 'white', color: isSelected ? 'white' : '#374151',
    fontWeight: isSelected ? 'bold' : 'normal', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s'
  });

  // ★ 토글 버튼 스타일 (중복 선택용)
  const toggleBtnStyle = (isActive, color) => ({
    flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid',
    borderColor: isActive ? color : '#d1d5db',
    backgroundColor: isActive ? `${color}20` : 'white', // 연한 배경색 (예: #ff000020)
    color: isActive ? color : '#6b7280',
    fontWeight: 'bold', cursor: 'pointer'
  });

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px', paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px' }}>
        {isEdit ? '매물 수정' : '새 매물 등록'}
      </h2>
      
      <label style={labelStyle}>거래 상태</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button type="button" style={btnStyle(form.status === '거래전', '#9ca3af')} onClick={() => handleTypeSelect('status', '거래전')}>거래전</button>
        <button type="button" style={btnStyle(form.status === '거래중', '#2563eb')} onClick={() => handleTypeSelect('status', '거래중')}>거래중</button>
        <button type="button" style={btnStyle(form.status === '거래완료', '#ef4444')} onClick={() => handleTypeSelect('status', '거래완료')}>완료</button>
      </div>

      <label style={labelStyle}>매물 유형</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {['아파트', '오피스텔', '빌라', '상가', '사무실', '토지'].map(type => (
          <button type="button" key={type} style={btnStyle(form.property_type === type)} onClick={() => handleTypeSelect('property_type', type)}>{type}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, marginTop: 0 }}>건물명</label>
          <input name="building_name" value={form.building_name} onChange={handleChange} style={inputStyle} placeholder="건물명" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ ...labelStyle, marginTop: 0 }}>동/호수</label>
          <input name="detailed_address" value={form.detailed_address} onChange={handleChange} style={inputStyle} placeholder="101-101" />
        </div>
      </div>

      <label style={labelStyle}>기본 주소</label>
      <input value={form.address} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6' }} />

      <h3 style={{fontSize:'1rem', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'30px'}}>거래 및 가격 정보 (복수 선택 가능)</h3>
      
      {/* ★ 거래 유형 버튼 (중복 선택 가능) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom:'15px', marginTop:'10px' }}>
        <button type="button" onClick={() => toggleTransactionType('is_sale')} style={toggleBtnStyle(form.is_sale, '#ef4444')}>매매</button>
        <button type="button" onClick={() => toggleTransactionType('is_jeonse')} style={toggleBtnStyle(form.is_jeonse, '#3b82f6')}>전세</button>
        <button type="button" onClick={() => toggleTransactionType('is_rent')} style={toggleBtnStyle(form.is_rent, '#10b981')}>월세</button>
      </div>

      {/* ★ 선택된 유형에 따른 입력 필드 (데이터는 숨겨져도 유지됨) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {form.is_sale && (
          <div style={{ backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px' }}>
            <label style={{ ...labelStyle, marginTop: 0, color:'#ef4444' }}>매매가 (만원)</label>
            <input type="number" name="sale_price" value={form.sale_price} onChange={handleChange} style={inputStyle} placeholder="매매가 입력" />
          </div>
        )}

        {form.is_jeonse && (
          <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '6px' }}>
            <label style={{ ...labelStyle, marginTop: 0, color:'#3b82f6' }}>전세 보증금 (만원)</label>
            <input type="number" name="jeonse_deposit" value={form.jeonse_deposit} onChange={handleChange} style={inputStyle} placeholder="전세금 입력" />
          </div>
        )}

        {form.is_rent && (
          <div style={{ backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px', display:'flex', gap:'8px' }}>
            <div style={{flex:1}}>
                <label style={{ ...labelStyle, marginTop: 0, color:'#10b981' }}>월세 보증금</label>
                <input type="number" name="rent_deposit" value={form.rent_deposit} onChange={handleChange} style={inputStyle} placeholder="보증금" />
            </div>
            <div style={{flex:1}}>
                <label style={{ ...labelStyle, marginTop: 0, color:'#10b981' }}>월세액</label>
                <input type="number" name="rent_amount" value={form.rent_amount} onChange={handleChange} style={inputStyle} placeholder="월세" />
            </div>
          </div>
        )}

        {/* 공통 가격 정보 */}
        <div style={{ display: 'flex', gap: '8px' }}>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>권리금 (만원)</label>
                <input type="number" name="key_money" value={form.key_money} onChange={handleChange} style={inputStyle} placeholder="권리금" />
             </div>
             <div style={{ flex: 1 }}>
                <label style={labelStyle}>관리비 (만원)</label>
                <input type="number" name="maintenance_fee" value={form.maintenance_fee} onChange={handleChange} style={inputStyle} />
             </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <div style={{ flex: 1 }}><label style={labelStyle}>평수</label><input name="area" value={form.area} onChange={handleChange} style={inputStyle} placeholder="평" /></div>
        <div style={{ flex: 1 }}><label style={labelStyle}>층수</label><input name="floor" value={form.floor} onChange={handleChange} style={inputStyle} placeholder="층" /></div>
      </div>

      {/* 상세 정보 섹션 */}
      <h3 style={{fontSize:'1rem', borderBottom:'1px solid #eee', paddingBottom:'5px', marginTop:'30px'}}>상세 정보</h3>
      <label style={labelStyle}>키워드 (지도 표시)</label>
      <input name="keywords" value={form.keywords} onChange={handleChange} style={inputStyle} placeholder="10자 이내 (급매, 역세권 등)" />
      
      <label style={labelStyle}>메모</label>
      <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} style={{ ...inputStyle, height: 'auto' }} placeholder="상세 내용 입력" />

      {/* 사진 업로드 섹션 */}
      <label style={labelStyle}>
        사진 (최대 20장) 
        <span style={{fontSize:'11px', color:'#6b7280', marginLeft:'5px', fontWeight: 'normal'}}>
          *자동 압축됨 ({((form.image_urls?.length || 0) + newFiles.length)}/20)
        </span>
      </label>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
        {form.image_urls && form.image_urls.map((url, idx) => (
          <div key={`old-${idx}`} style={{ position: 'relative', width: '64px', height: '64px' }}>
            <img src={url} alt="매물" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb' }} />
            <button type="button" onClick={() => handleRemoveImage(idx, false)} 
              style={{ position: 'absolute', top: -6, right: -6, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>✕</button>
          </div>
        ))}
        {newFiles.map((file, idx) => (
          <div key={`new-${idx}`} style={{ position: 'relative', width: '64px', height: '64px' }}>
            <img src={URL.createObjectURL(file)} alt="업로드 예정" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', border: '2px solid #3b82f6' }} />
            <button type="button" onClick={() => handleRemoveImage(idx, true)} 
              style={{ position: 'absolute', top: -6, right: -6, width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', color: 'white', border: '2px solid white', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>✕</button>
          </div>
        ))}
        {((form.image_urls?.length || 0) + newFiles.length) < 20 && (
          <label style={{ 
              width: '64px', height: '64px', border: '1px dashed #d1d5db', borderRadius: '4px', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', backgroundColor: '#f9fafb', fontSize: '20px', color: '#9ca3af',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          >
            +
            <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', marginTop: '30px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {loading ? '저장 중...' : (isEdit ? '수정 완료' : '등록 완료')}
      </button>
    </form>
  );
};

export default PinForm;