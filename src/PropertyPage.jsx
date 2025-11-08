import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient.js'
import styles from './PropertyPage.module.css'; 

/* 17일차 (수정): '매물 리스트'와 '매물 등록' 페이지 (★역 지오코딩 적용★) */
export default function PropertyPage({ session }) {
  const [properties, setProperties] = useState([]) // 'pins' 테이블 (주소 포함)
  const [loading, setLoading] = useState(true)
  
  // 새 매물 등록 폼 상태
  const [newAddress, setNewAddress] = useState('') 
  const [newMemo, setNewMemo] = useState('')     
  const [newPrice, setNewPrice] = useState(0)      
  const [newCoords, setNewCoords] = useState(null) 

  // ★ 17-2차 수정: 좌표 -> 주소 변환 (역 지오코딩) 헬퍼 함수
  const getAddressFromCoords = (lat, lng) => {
    // 이 함수는 Promise를 반환합니다.
    return new Promise((resolve) => {
      // Geocoder가 로드되었는지 확인 (14일차 기능)
      if (!window.kakao || !window.kakao.maps.services || !window.kakao.maps.services.Geocoder) {
        resolve('Geocoder 없음'); // Geocoder API가 없으면 실패
        return;
      }
      const geocoder = new window.kakao.maps.services.Geocoder();
      
      // coord2Address (좌표 -> 주소 변환)
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          // 도로명 주소가 있으면 도로명, 없으면 지번 주소 사용
          const road = result[0].road_address ? result[0].road_address.address_name : null;
          const jibun = result[0].address ? result[0].address.address_name : null;
          resolve(road || jibun || '주소 정보 없음');
        } else {
          resolve('주소 변환 실패'); // API 호출 실패
        }
      });
    });
  };

  // 1. (Read) 매물 목록 (pins) 읽어오기 (★ 17-2차 수정: 주소 변환 로직 추가)
  const fetchProperties = async () => {
    setLoading(true);
    
    // 1-1. Supabase에서 핀 정보(좌표) 로드
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
    
    if (!pinsData || pinsData.length === 0) {
      setProperties([]); // 데이터가 없으면 빈 배열
      setLoading(false);
      return;
    }

    // 1-2. (★핵심★) 역 지오코딩 (좌표 -> 주소)
    try {
      // Promise.all을 사용하여 모든 핀의 주소를 '병렬'로 동시에 조회합니다.
      const addressPromises = pinsData.map(pin => 
        getAddressFromCoords(pin.lat, pin.lng)
      );
      // 모든 주소 조회가 완료될 때까지 기다립니다.
      const addresses = await Promise.all(addressPromises);
      
      // 1-3. 핀 데이터에 주소 정보(address)를 합칩니다.
      const propertiesWithAddress = pinsData.map((pin, index) => ({
        ...pin,
        address: addresses[index] // 'address'라는 새 필드 추가
      }));

      setProperties(propertiesWithAddress); // 주소가 포함된 목록을 state에 저장
      
    } catch (geocodeError) {
      console.error('주소 변환 중 오류 발생:', geocodeError.message);
      // 주소 변환에 실패하더라도, 핀 목록은 보여줍니다 (주소 필드만 비워진 채)
      setProperties(pinsData.map(pin => ({ ...pin, address: '주소 조회 실패' })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Geocoder API가 로드될 시간을 주기 위해 (표준 방식)
    // window.kakao.maps.load() 콜백 안에서 fetchProperties를 호출합니다.
    if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
            fetchProperties();
        });
    }
  }, []) // 빈 배열로 마운트 시 1회만 실행

  // 2. (Create) '새 매물 등록' 폼 제출 핸들러 (이전과 동일)
  const handleCreateProperty = async (event) => {
    event.preventDefault() 
    if (!newMemo || !newCoords) {
      alert('매물 메모와 좌표는 필수입니다. (주소로 좌표 변환을 먼저 실행하세요)')
      return
    }
    setLoading(true)
    const newPropertyData = { 
        memo: newMemo, 
        price: Number(newPrice),
        lat: newCoords.lat,
        lng: newCoords.lng,
        user_id: session.user.id,
    }
    
    const { data, error } = await supabase.from('pins').insert(newPropertyData).select();
    if (error) {
      console.error('매물 생성 오류:', error.message)
    } else {
      // 새 매물 등록 시, 리스트 전체를 새로고침하여 새 주소도 가져오도록 합니다.
      fetchProperties(); 
      // 폼 초기화
      setNewAddress('')
      setNewMemo('')
      setNewPrice(0)
      setNewCoords(null)
    }
    // setLoading(false) // fetchProperties가 알아서 처리하므로 제거
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

  // 화면 렌더링
  return (
    <div className={styles.pageContainer}>
      
      {/* 1. '새 매물 등록' 폼 (왼쪽) */}
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
            <label className={styles.label}>메모 (지도 팝업 내용)</label>
            <textarea
              className={styles.textarea}
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="예: 강남 30억 이하 아파트, 30평대..."
              required
            />
          </div>
          <div>
            <label className={styles.label}>가격 (만원)</label>
            <input
              className={styles.input}
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="10000"
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

      {/* 2. '매물 리스트' (오른쪽) */}
      <section className={styles.listSection}>
        <h2 className={styles.listTitle}>
          매물 리스트 (총 {properties.length}건)
        </h2>
        
        {loading && <p>매물 목록을 불러오는 중...</p>}
        {!loading && properties.length === 0 && (
          <p className={styles.emptyText}>등록된 매물이 없습니다. 왼쪽 폼에서 새 매물을 등록하세요.</p>
        )}
        
        <div className={styles.table}>
          {/* 테이블 헤더 (★ 17-2차: col1 이름 변경) */}
          <div className={styles.tableHeader}>
            <div className={styles.col1}>주소 및 메모</div>
            <div className={styles.col2}>가격(만원)</div>
            <div className={styles.col3}>좌표 (Lat, Lng)</div>
            <div className={styles.col4}>등록일</div>
            <div className={styles.col5}>관리</div>
          </div>
          
          {/* 테이블 바디 (★ 17-2차: col1 렌더링 방식 변경) */}
          <div>
            {properties.map(pin => (
              <div 
                key={pin.id} 
                className={styles.tableRow}
              >
                <div className={styles.col1}>
                  {/* pin.address (새로 추가된 필드)를 굵게 표시 */}
                  <span className={styles.addressText}>{pin.address || '주소 로딩 중...'}</span>
                  {/* pin.memo (기존 메모)를 작게 표시 */}
                  <span className={styles.memoText}>{pin.memo || '-'}</span>
                </div>
                <div className={styles.col2}>{pin.price.toLocaleString()}</div>
                <div className={styles.col3}>
                    {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
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