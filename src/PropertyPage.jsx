// src/PropertyPage.jsx (수정)
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './PropertyPage.module.css'; 

export default function PropertyPage({ session }) {
  const [properties, setProperties] = useState([]) 
  const [loading, setLoading] = useState(true)
  
  // ★ (수정) 폼 상태: MapContext와 동일하게 변경
  const [newAddress, setNewAddress] = useState('') 
  const [newDetailedAddress, setNewDetailedAddress] = useState('');
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newIsSale, setNewIsSale] = useState(false);
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newIsJeonse, setNewIsJeonse] = useState(false);
  const [newJeonseDeposit, setNewJeonseDeposit] = useState('');
  const [newJeonsePremium, setNewJeonsePremium] = useState('');
  const [newIsRent, setNewIsRent] = useState(false);
  const [newRentDeposit, setNewRentDeposit] = useState('');
  const [newRentAmount, setNewRentAmount] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCoords, setNewCoords] = useState(null) 

  // ★ (수정) 역 지오코딩 (좌표 -> 주소)
  const getAddressFromCoords = (lat, lng) => {
    return new Promise((resolve) => {
      if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        resolve('Geocoder 없음'); 
        return;
      }
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const road = result[0].road_address ? result[0].road_address.address_name : null;
          const jibun = result[0].address ? result[0].address.address_name : null;
          resolve(road || jibun || '주소 정보 없음');
        } else {
          resolve('주소 변환 실패'); 
        }
      });
    });
  };

  // 1. (Read) 매물 목록 (pins) 읽어오기
  const fetchProperties = async () => {
    setLoading(true);
    
    // ★ (수정) 모든 새 컬럼을 가져오도록 '*' 사용
    const { data: pinsData, error: dbError } = await supabase
      .from('pins')
      .select('*') 
      .order('created_at', { ascending: false });
      
    if (dbError) {
      console.error('매물 목록 로드 오류:', dbError.message);
      setProperties([]);
      setLoading(false);
      return;
    }
    
    setProperties(pinsData || []);
    setLoading(false);
  }

  useEffect(() => {
    // Geocoder API가 로드될 시간을 주기 위해 (표준 방식)
    if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
            fetchProperties();
        });
    }
  }, []) // 빈 배열로 마운트 시 1회만 실행

  // 2. (Create) '새 매물 등록' 폼 제출 핸들러 (★ 대폭 수정)
  const handleCreateProperty = async (event) => {
    event.preventDefault() 
    if (!newAddress || !newCoords) {
      alert('주소와 좌표는 필수입니다. (주소로 좌표 변환을 먼저 실행하세요)')
      return
    }
    setLoading(true)
    
    // ★ (수정) 새 데이터 구조로 저장
    const newPropertyData = { 
        address: newAddress,
        detailed_address: newDetailedAddress,
        building_name: newBuildingName,
        is_sale: newIsSale,
        sale_price: Number(newSalePrice) || null,
        is_jeonse: newIsJeonse,
        jeonse_deposit: Number(newJeonseDeposit) || null,
        jeonse_premium: Number(newJeonsePremium) || null,
        is_rent: newIsRent,
        rent_deposit: Number(newRentDeposit) || null,
        rent_amount: Number(newRentAmount) || null,
        keywords: newKeywords,
        notes: newNotes,
        status: '거래전', // 기본값
        image_urls: ['', '', ''], // 기본값

        lat: newCoords.lat,
        lng: newCoords.lng,
        user_id: session.user.id,
    }
    
    const { data, error } = await supabase.from('pins').insert(newPropertyData).select();
    if (error) {
      console.error('매물 생성 오류:', error.message)
      alert('매물 생성 오류: ' + error.message);
    } else {
      // 새 매물 등록 시, 리스트 전체를 새로고침
      fetchProperties(); 
      
      // 폼 초기화
      setNewAddress('')
      setNewDetailedAddress('')
      setNewBuildingName('')
      setNewIsSale(false);
      setNewSalePrice('');
      setNewIsJeonse(false);
      setNewJeonseDeposit('');
      setNewJeonsePremium('');
      setNewIsRent(false);
      setNewRentDeposit('');
      setNewRentAmount('');
      setNewKeywords('');
      setNewNotes('');
      setNewCoords(null)
    }
    // setLoading(false) // fetchProperties가 알아서 처리
  }

  // 3. (Delete) '매물 삭제' 버튼 클릭 핸들러 (이전과 동일)
  const handleDeleteProperty = async (pinId) => {
    setLoading(true)
    const { error } = await supabase
      .from('pins')
      .delete()
      .eq('id', pinId)

    if (error) {
      console.error('매물 삭제 오류:', error.message)
    } else {
      setProperties(currentProperties => currentProperties.filter(p => p.id !== pinId))
    }
    setLoading(false)
  }
  
  // 4. '주소로 좌표 변환' 버튼 핸들러 (이전과 동일)
  const handleGeocode = () => {
    if (!newAddress) {
        alert('주소를 입력하세요.');
        return;
    }
    
    if (!window.kakao || !window.kakao.maps.services) {
        alert('카카오맵 "services" 라이브러리가 로드되지 않았습니다.');
        return;
    }
    
    const geocoder = new window.kakao.maps.services.Geocoder();
    
    geocoder.addressSearch(newAddress, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
            const coords = {
                lat: result[0].y,
                lng: result[0].x
            };
            setNewCoords(coords); 
            alert(`좌표 변환 성공: [${coords.lat}, ${coords.lng}]`);
        } else {
            alert('주소로 좌표를 찾지 못했습니다.');
            setNewCoords(null);
        }
    });
  }

  // 날짜 포맷팅 유틸리티
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }
  
  // ★ (추가) 가격 포맷팅 유틸리티 (LeftPanel.jsx에서 복사)
  const formatPrice = (pin) => {
    if (pin.is_sale && pin.sale_price) {
        return `${pin.sale_price.toLocaleString()} 만원`;
    }
    if (pin.is_jeonse && pin.jeonse_deposit) {
        return `${pin.jeonse_deposit.toLocaleString()} 만원`;
    }
    if (pin.is_rent && (pin.rent_deposit || pin.rent_amount)) {
        return `${pin.rent_deposit || 0}/${pin.rent_amount || 0}`;
    }
    return '-';
  }


  // 화면 렌더링
  return (
    <div className={styles.pageContainer}>
      
      {/* 1. '새 매물 등록' 폼 (왼쪽) ★ (수정) */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>
          새 매물 등록
        </h2>
        <form className={styles.form} onSubmit={handleCreateProperty}>
          <div>
            <label className={styles.label}>주소 (좌표 변환용)</label>
            <div className={styles.addressGroup}>
                <input
                  className={styles.input}
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                />
                <button 
                  type="button" 
                  onClick={handleGeocode}
                  className={styles.geocodeButton}
                  disabled={loading}
                >
                    좌표 변환
                </button>
            </div>
            {newCoords && (
                <p className={styles.coordsText}>
                    lat: {newCoords.lat}, lng: {newCoords.lng}
                </p>
            )}
          </div>
          
          <div>
            <label className={styles.label}>상세 주소</label>
            <input
              className={styles.input}
              type="text"
              value={newDetailedAddress}
              onChange={(e) => setNewDetailedAddress(e.target.value)}
              placeholder="예: 101동 101호"
            />
          </div>
          
          <div>
            <label className={styles.label}>건물명</label>
            <input
              className={styles.input}
              type="text"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              placeholder="예: 현대아파트"
            />
          </div>

          <div>
            <label className={styles.label}>거래 유형</label>
             <div className={styles.checkboxGroup}> {/* MapPage.module.css 스타일 재사용 */}
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={newIsSale} onChange={(e) => setNewIsSale(e.target.checked)} /> 매매
                </label>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={newIsJeonse} onChange={(e) => setNewIsJeonse(e.target.checked)} /> 전세
                </label>
                <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={newIsRent} onChange={(e) => setNewIsRent(e.target.checked)} /> 월세
                </label>
            </div>
          </div>
          
          {/* ★ (추가) 조건부 폼 */}
          {newIsSale && (
            <div>
              <label className={styles.label}>매매 금액 (만원)</label>
              <input className={styles.input} type="number" value={newSalePrice} onChange={(e) => setNewSalePrice(e.target.value)} />
            </div>
          )}
          {newIsJeonse && (
            <>
              <div>
                <label className={styles.label}>전세 보증금 (만원)</label>
                <input className={styles.input} type="number" value={newJeonseDeposit} onChange={(e) => setNewJeonseDeposit(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>권리금 (만원)</label>
                <input className={styles.input} type="number" value={newJeonsePremium} onChange={(e) => setNewJeonsePremium(e.target.value)} />
              </div>
            </>
          )}
          {newIsRent && (
             <>
              <div>
                <label className={styles.label}>월세 보증금 (만원)</label>
                <input className={styles.input} type="number" value={newRentDeposit} onChange={(e) => setNewRentDeposit(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>월세 (만원)</label>
                <input className={styles.input} type="number" value={newRentAmount} onChange={(e) => setNewRentAmount(e.target.value)} />
              </div>
            </>
          )}

          <div>
            <label className={styles.label}>키워드</label>
            <input
              className={styles.input}
              type="text"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              placeholder="예: #역세권, #신축"
            />
          </div>
          
          <div>
            <label className={styles.label}>상세 메모</label>
            <textarea
              className={styles.textarea}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="매물 상세 정보..."
              required
            />
          </div>
          
          <button 
            type="submit" 
            className={styles.button}
            disabled={loading || !newCoords} // 좌표가 없으면 등록 버튼 비활성화
          >
            {loading ? '등록 중...' : '매물 등록 (핀 생성)'}
          </button>
        </form>
      </aside>

      {/* 2. '매물 리스트' (오른쪽) ★ (수정) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          매물 리스트 (총 {properties.length}건)
        </h2>
        
        {loading && <p>매물 목록을 불러오는 중...</p>}
        {!loading && properties.length === 0 && (
          <p className={styles.emptyText}>등록된 매물이 없습니다. 왼쪽 폼에서 새 매물을 등록하세요.</p>
        )}
        
        <div className={styles.table}>
          {/* ★ (수정) 테이블 헤더 */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>주소/건물명</div>
            <div className={styles.col2}>거래정보</div>
            <div className={styles.col3}>메모/키워드</div>
            <div className={styles.col4}>등록일</div>
            <div className={styles.col5}>관리</div>
          </div>
          
          {/* ★ (수정) 테이블 바디 */}
          <div>
            {properties.map(pin => (
              <div 
                key={pin.id} 
                className={styles.tableRow}
              >
                <div className={styles.col1}>
                  <span className={styles.addressText}>{pin.address || '주소 로딩 중...'}</span>
                  <span className={styles.memoText}>{pin.detailed_address || ''}</span>
                  <span className={styles.memoText}>{pin.building_name || '-'}</span>
                </div>
                
                {/* ★ (수정) 가격 표시 */}
                <div className={styles.col2}>
                  {formatPrice(pin)}
                  <span className={styles.memoText}>({pin.status || '거래전'})</span>
                </div>
                
                <div className={styles.col3}>
                    {pin.notes || '-'}
                    <span className={styles.keywordsText}>{pin.keywords}</span>
                </div>
                <div className={styles.col4}>{formatDate(pin.created_at)}</div>
                <div className={styles.col5}>
                  <button 
                    onClick={() => handleDeleteProperty(pin.id)}
                    className={styles.deleteButton}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}